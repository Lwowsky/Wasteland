/**
 * Conservative, dependency-free source hygiene report.
 * Counts identical files, CSS selectors repeated within the same @media context,
 * and large modules. Does NOT attempt to prove that dynamic React classes or
 * exported functions are unused; deleting them from a text search is unsafe.
 *
 * Run: npm run audit:code-css
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["src", "shared", "worker"];
const SOURCE_TYPES = new Set([".js", ".jsx", ".css", ".json"]);

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\r\n]/g, " "));
}

function findDelimiter(text, start) {
  let quote = "";
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = "";
    } else if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "{" || char === "}" || char === ";") {
      return i;
    }
  }
  return -1;
}

function closeBrace(text, start) {
  let depth = 1;
  let quote = "";
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = "";
    } else if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return i;
  }
  return -1;
}

export function cssSelectors(source) {
  const text = stripCssComments(source);
  const selectors = [];
  const visit = (start, end, context) => {
    let i = start;
    while (i < end) {
      const delimiter = findDelimiter(text, i);
      if (delimiter < 0 || delimiter >= end) break;
      const prelude = text.slice(i, delimiter).trim().replace(/\s+/g, " ");
      const kind = text[delimiter];
      if (kind !== "{") {
        i = delimiter + 1;
        continue;
      }
      const close = closeBrace(text, delimiter + 1);
      if (close < 0 || close >= end) break;
      if (prelude.startsWith("@")) {
        // Only conditional style blocks define selector scopes. Do not treat
        // keyframe percentages or @font-face declarations as CSS selectors.
        if (/^@(media|supports|container|layer)\b/i.test(prelude)) {
          visit(delimiter + 1, close, [...context, prelude]);
        }
      } else if (prelude) {
        const body = text.slice(delimiter + 1, close);
        const declarations = new Map();
        for (const match of body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;{}]+)/g)) {
          declarations.set(match[1].toLowerCase(), match[2].trim());
        }
        selectors.push({ selector: prelude, context: context.join(" / "), declarations });
      }
      i = close + 1;
    }
  };
  visit(0, text.length, []);
  return selectors;
}

export function inspectCodeCss(root = ROOT) {
  const files = SOURCE_DIRS.flatMap((dir) => listFiles(path.join(root, dir)))
    .filter((file) => SOURCE_TYPES.has(path.extname(file)));
  const cssFiles = files.filter((file) => file.endsWith(".css"));
  const hashes = new Map();
  const scopedSelectors = new Map();
  const largeFiles = [];
  let selectorCount = 0;

  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const source = fs.readFileSync(file, "utf8");
    const hash = createHash("sha256").update(source).digest("hex");
    if (!hashes.has(hash)) hashes.set(hash, []);
    hashes.get(hash).push(relative);
    const lines = countLines(source);
    if (lines > 400) largeFiles.push({ file: relative, lines });
    if (!file.endsWith(".css")) continue;
    for (const rule of cssSelectors(source)) {
      selectorCount += 1;
      const key = JSON.stringify([rule.context, rule.selector]);
      if (!scopedSelectors.has(key)) scopedSelectors.set(key, []);
      scopedSelectors.get(key).push({ file: relative, declarations: rule.declarations });
    }
  }

  const repeatedSelectors = [];
  for (const [key, rules] of scopedSelectors) {
    if (rules.length < 2) continue;
    const [[context, selector]] = [JSON.parse(key)];
    const values = new Map();
    for (const rule of rules) {
      for (const [property, value] of rule.declarations) {
        if (!values.has(property)) values.set(property, new Set());
        values.get(property).add(value);
      }
    }
    const conflictingProperties = [...values].filter(([, options]) => options.size > 1)
      .map(([name]) => name);
    repeatedSelectors.push({ context, selector, files: rules.map((rule) => rule.file),
      conflictingProperties });
  }

  return {
    sourceFiles: files.length,
    cssFiles: cssFiles.length,
    selectorCount,
    identicalFiles: [...hashes.values()].filter((group) => group.length > 1),
    repeatedSelectors,
    largeFiles: largeFiles.sort((a, b) => b.lines - a.lines),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectCodeCss();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`CODE_CSS_REVIEW: ${report.sourceFiles} source files, ${report.cssFiles} CSS files, ${report.selectorCount} rules`);
    console.log(`${report.identicalFiles.length} byte-identical file groups, ${report.repeatedSelectors.length} repeated selector scopes`);
    report.repeatedSelectors.forEach((item) =>
      console.log(`? CSS ${item.selector} (${item.context || "global"}): ${item.files.join(", ")}`));
    console.log(`Large files (>400 lines): ${report.largeFiles.length}`);
    report.largeFiles.forEach(({ file, lines }) => console.log(`  ${lines} ${file}`));
    console.log("NOTE: This report never deletes files; computed class names and runtime usage need manual review.");
  }
}
