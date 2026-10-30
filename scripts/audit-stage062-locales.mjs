/** Audits the completed Vietnamese / Arabic active catalogs.
 * Every file is imported by the active application and checked strictly.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = path.join(ROOT, "src/i18n/locales/en");
const DRAFTS = path.join(ROOT, "src/i18n/locales");
const LOCALES = ["vi", "ar"];
const INTENTIONAL = new Set([
  "404", "UTC", "Wasteland King", "Lwowsky", "Wasteland", "MIR", "UID",
  "EN", "UA", "RU", "PL", "DE", "JA", "ZH", "KO", "VI", "AR",
  "Українська", "English", "Русский", "Polski", "Deutsch", "日本語", "中文",
  "한국어", "Tiếng Việt", "العربية", "XLSX · XLS · CSV", "Player123",
  "email@example.com", "••••••••", "RESTORE REGION DATA", "DELETE REGION DATA",
]);

function jsonFiles(folder) {
  function scan(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? scan(file) : entry.name.endsWith(".json") ? [file] : [];
    });
  }
  return scan(folder).map((file) => path.relative(folder, file).replaceAll(path.sep, "/")).sort();
}

function flatten(value, prefix = "") {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, `${prefix}${Array.isArray(value) ? `[${key}]` : `.${key}`}`));
  }
  return [[prefix, value]];
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)]
    .map((match) => match[1]).sort().join("|");
}

export function auditStage062Locales() {
  const files = jsonFiles(BASE);
  const errors = [];
  const summaries = {};
  for (const lang of LOCALES) {
    const root = path.join(DRAFTS, lang);
    const destFiles = jsonFiles(root);
    const pending = [];
    let translated = 0;
    let invariant = 0;
    let total = 0;
    for (const file of files) {
      if (!destFiles.includes(file)) {
        errors.push(`${lang}: missing ${file}`);
        continue;
      }
      const original = new Map(flatten(JSON.parse(fs.readFileSync(path.join(BASE, file), "utf8"))));
      const localized = new Map(flatten(JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))));
      for (const [key, value] of original) {
        if (!localized.has(key)) { errors.push(`${lang}/${file}: missing ${key}`); continue; }
        const result = localized.get(key);
        if (typeof result !== typeof value) errors.push(`${lang}/${file}: wrong type ${key}`);
        if (typeof value !== "string") continue;
        total++;
        if (typeof result !== "string" || !result.trim()) errors.push(`${lang}/${file}: empty ${key}`);
        if (placeholders(value) !== placeholders(result)) errors.push(`${lang}/${file}: tokens ${key}`);
        if (value !== result) translated++;
        else if (INTENTIONAL.has(value)) invariant++;
        else pending.push(`${file}${key} :: ${value}`);
      }
      for (const key of localized.keys()) if (!original.has(key)) errors.push(`${lang}/${file}: extra ${key}`);
    }
    for (const file of destFiles) if (!files.includes(file)) errors.push(`${lang}: extra ${file}`);
    summaries[lang] = { total, translated, invariant, pending };
  }
  return { errors, summaries };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, summaries } = auditStage062Locales();
  for (const [lang, stats] of Object.entries(summaries)) {
    console.log(`STAGE062_${lang.toUpperCase()}_ACTIVE: ${stats.translated}/${stats.total} translated; ` +
      `${stats.invariant} invariant; ${stats.pending.length} pending`);
    if (process.argv.includes("--list")) console.log(stats.pending.join("\n"));
  }
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else if (process.argv.includes("--strict") &&
    Object.values(summaries).some((stat) => stat.pending.length)) {
    console.error("STAGE062_NOT_READY: incomplete VI/AR active locales.");
    process.exitCode = 1;
  } else console.log("STAGE062_LOCALE_STRUCTURE_OK");
}
