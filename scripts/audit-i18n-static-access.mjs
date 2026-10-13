/**
 * Validate dotted accesses on translation objects (`t` and `copy`).
 * We deliberately accept a key in any catalog subtree because components
 * frequently receive a section of the translations via props. We only report
 * paths that cannot exist in ANY section of the English catalog. This is a
 * conservative check; computed keys and non-literal brackets remain outside
 * its scope and are handled by component/regression tests.
 *
 * Usage: node scripts/audit-i18n-static-access.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALE_DIR = path.join("src", "i18n", "locales", "en");
// These are string/array methods, not translation keys. A method may only be
// stripped if the parent translation path actually exists.
const STRING_METHODS = new Set([
  "replace", "replaceAll", "trim", "toLowerCase", "toUpperCase",
  "split", "includes", "startsWith", "endsWith", "match", "length",
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(dir, item.name);
    return item.isDirectory() ? walk(file) : [file];
  });
}

export function catalogPaths(root = ROOT) {
  const localeRoot = path.join(root, LOCALE_DIR);
  const keys = new Set();
  function visit(value, prefix) {
    if (prefix) keys.add(prefix);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        visit(child, prefix ? `${prefix}.${key}` : key);
      }
    }
  }
  for (const file of walk(localeRoot).filter((f) => f.endsWith(".json"))) {
    // Namespace mirrors src/i18n/index.js: admin/access.json -> admin.access,
    // content/settings.json -> settings (content/* has a top-level alias).
    const rel = path.relative(localeRoot, file).replaceAll(path.sep, "/").replace(/\.json$/, "");
    const alias = rel.startsWith("content/") || rel.startsWith("ui/") ? rel.split("/")[1] : rel.replaceAll("/", ".");
    visit(JSON.parse(fs.readFileSync(file, "utf8")), alias);
  }
  return keys;
}

function knownPath(value, keys) {
  if (keys.has(value)) return true;
  for (const pathValue of keys) {
    if (pathValue.endsWith(`.${value}`)) return true;
  }
  return false;
}

export function findUnresolvedTranslationAccesses(source, keys, file = "<source>") {
  const errors = [];
  // Intentionally only straightforward dot chains. Dynamic property access,
  // object keys, template literals, import-parsing aliases and code in comments
  // are not considered proven static translation references here.
  const regex = /\b(?:t|copy)\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)/g;
  for (const match of source.matchAll(regex)) {
    const fullPath = match[1];
    if (knownPath(fullPath, keys)) continue;
    const parts = fullPath.split(".");
    while (parts.length > 1 && STRING_METHODS.has(parts.at(-1))) parts.pop();
    if (parts.length >= 1 && knownPath(parts.join("."), keys)) continue;
    const line = source.slice(0, match.index).split("\n").length;
    errors.push(`${file}:${line} missing static translation path: ${fullPath}`);
  }
  return errors;
}

export function auditStaticTranslationAccesses(root = ROOT) {
  const keys = catalogPaths(root);
  const src = path.join(root, "src");
  return walk(src)
    .filter((file) => /\.(?:js|jsx)$/.test(file))
    .filter((file) => !file.includes(`${path.sep}i18n${path.sep}locales${path.sep}`))
    .flatMap((file) => findUnresolvedTranslationAccesses(
      fs.readFileSync(file, "utf8"), keys, path.relative(root, file).replaceAll(path.sep, "/"),
    ));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = auditStaticTranslationAccesses();
  if (errors.length) {
    console.error("I18N_STATIC_KEYS_FAILED:\n" + errors.map((v) => `- ${v}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("I18N_STATIC_KEYS_OK");
  }
}
