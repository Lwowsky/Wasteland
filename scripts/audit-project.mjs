import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src", "worker", "shared"].map((dir) =>
  path.join(ROOT, dir),
);
const ENTRY_FILES = [
  path.join(ROOT, "src", "main.jsx"),
  path.join(ROOT, "worker", "src", "index.js"),
];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".css", ".json"]);
const MAINTAINABILITY_WARNING_LINES = 500;
const RESOLVE_EXTENSIONS = ["", ".js", ".jsx", ".css", ".json"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function isSourceFile(file) {
  return SOURCE_EXTENSIONS.has(path.extname(file));
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;

  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const extension of RESOLVE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }

  for (const extension of RESOLVE_EXTENSIONS.slice(1)) {
    const candidate = path.join(base, `index${extension}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }

  return "MISSING";
}


function getNamedRelativeImports(file) {
  if (![".js", ".jsx"].includes(path.extname(file))) return [];

  const source = fs.readFileSync(file, "utf8");
  const imports = [];
  const pattern = /\bimport\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g;

  for (const match of source.matchAll(pattern)) {
    const specifier = match[2];
    if (!specifier?.startsWith(".")) continue;

    const names = match[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.split(/\s+as\s+/)[0]?.trim())
      .filter(Boolean);

    imports.push({ specifier, names });
  }

  return imports;
}

const exportNameCache = new Map();

function getExportedNames(file, stack = new Set()) {
  const normalized = path.normalize(file);
  if (exportNameCache.has(normalized)) return exportNameCache.get(normalized);
  if (stack.has(normalized)) return new Set();

  stack.add(normalized);
  const source = fs.readFileSync(normalized, "utf8");
  const names = new Set();

  for (const match of source.matchAll(
    /\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1]);
  }

  for (const match of source.matchAll(/\bexport\s*\{([\s\S]*?)\}(?:\s*from\s*["'][^"']+["'])?/g)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const pieces = trimmed.split(/\s+as\s+/);
      names.add((pieces[1] || pieces[0]).trim());
    }
  }

  for (const match of source.matchAll(/\bexport\s*\*\s*from\s*["']([^"']+)["']/g)) {
    const specifier = match[1];
    const resolved = resolveRelativeImport(normalized, specifier);
    if (!resolved || resolved === "MISSING") continue;

    for (const exportedName of getExportedNames(resolved, new Set(stack))) {
      names.add(exportedName);
    }
  }

  exportNameCache.set(normalized, names);
  return names;
}

function getRelativeImports(file) {
  const source = fs.readFileSync(file, "utf8");
  const imports = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  if (path.extname(file) === ".css") {
    patterns.push(/@import\s+(?:url\()?\s*["']([^"']+)["']/g);
  }

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]?.startsWith(".")) imports.push(match[1]);
    }
  }

  return [...new Set(imports)];
}

const allSourceFiles = SOURCE_ROOTS.flatMap(walk)
  .filter(isSourceFile)
  .map((file) => path.normalize(file));
const sourceSet = new Set(allSourceFiles);
const errors = [];
const warnings = [];
const graph = new Map();

for (const file of allSourceFiles) {
  const resolvedImports = [];

  if ([".js", ".jsx", ".css"].includes(path.extname(file))) {
    for (const specifier of getRelativeImports(file)) {
      const resolved = resolveRelativeImport(file, specifier);
      if (resolved === "MISSING") {
        errors.push(
          `Missing relative import: ${path.relative(ROOT, file)} -> ${specifier}`,
        );
      } else if (resolved && sourceSet.has(resolved)) {
        resolvedImports.push(resolved);
      }
    }
  }

  graph.set(file, resolvedImports);
}

for (const file of allSourceFiles) {
  for (const { specifier, names } of getNamedRelativeImports(file)) {
    const resolved = resolveRelativeImport(file, specifier);
    if (!resolved || resolved === "MISSING") continue;
    if (![".js", ".jsx"].includes(path.extname(resolved))) continue;

    const exportedNames = getExportedNames(resolved);
    for (const name of names) {
      if (!exportedNames.has(name)) {
        errors.push(
          `Missing named export: ${path.relative(ROOT, file)} imports ${name} from ${specifier}`,
        );
      }
    }
  }
}

const reachable = new Set();
const queue = ENTRY_FILES.map((file) => path.normalize(file));

while (queue.length) {
  const file = queue.shift();
  if (!sourceSet.has(file) || reachable.has(file)) continue;
  reachable.add(file);
  queue.push(...(graph.get(file) || []));
}

// Node test runner discovers these independently; they are not app import entrypoints.
const isTestFile = (file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
const unreachable = allSourceFiles.filter((file) => !reachable.has(file) && !isTestFile(file));
for (const file of unreachable) {
  errors.push(`Unreachable source file: ${path.relative(ROOT, file)}`);
}

for (const file of allSourceFiles.filter((item) => item.endsWith(".css"))) {
  const source = fs.readFileSync(file, "utf8");
  if (/!important\b/i.test(source)) {
    errors.push(`!important found: ${path.relative(ROOT, file)}`);
  }
}

for (const file of allSourceFiles.filter((item) =>
  [".js", ".jsx", ".css"].includes(path.extname(item)),
)) {
  const source = fs.readFileSync(file, "utf8");
  const lineCount = source.split(/\r?\n/).length;

  if (lineCount > MAINTAINABILITY_WARNING_LINES) {
    warnings.push(
      `Large source file (${lineCount} lines > ${MAINTAINABILITY_WARNING_LINES}): ${path.relative(ROOT, file)}`,
    );
  }
}

if (errors.length) {
  console.error("Project audit failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn(`Project maintenance warnings (${warnings.length}; no hard line limit):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log(
  `PROJECT_AUDIT_OK (${allSourceFiles.length} source files, ${reachable.size} reachable, 0 missing imports, 0 !important)`,
);
