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
const MAX_MAINTAINABLE_LINES = 500;
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

const reachable = new Set();
const queue = ENTRY_FILES.map((file) => path.normalize(file));

while (queue.length) {
  const file = queue.shift();
  if (!sourceSet.has(file) || reachable.has(file)) continue;
  reachable.add(file);
  queue.push(...(graph.get(file) || []));
}

const unreachable = allSourceFiles.filter((file) => !reachable.has(file));
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

  if (lineCount > MAX_MAINTAINABLE_LINES) {
    errors.push(
      `Source file is too large (${lineCount} lines > ${MAX_MAINTAINABLE_LINES}): ${path.relative(ROOT, file)}`,
    );
  }
}

if (errors.length) {
  console.error("Project audit failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `PROJECT_AUDIT_OK (${allSourceFiles.length} source files, ${reachable.size} reachable, 0 missing imports, 0 !important)`,
);
