/** Stage 060 DE/JA completeness and exact-placeholder audit. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "src/i18n/locales/en");
const DRAFT_LANGS = ["de", "ja"];
const EXPECTED_LITERAL = new Set([
  "404", "UTC", "Wasteland King", "Lwowsky", "email@example.com", "••••••••", "Player123",
  "EN", "UA", "RU", "PL", "DE", "JA", "ZH", "KO", "VI", "AR",
  "Русский", "Polski", "Deutsch", "日本語", "中文", "한국어", "Tiếng Việt", "العربية",
  "Українська", "Wasteland", "MIR", "UID", "XLSX · XLS · CSV", "RESTORE REGION DATA", "DELETE REGION DATA",
  "{{page}} / {{pages}}", "Wasteland King", "Lwowsky", "Player123", "Status", "Import", "Export", "System", "Region", "Reserve", "Owner", "Nickname", "Tier", "Tiers", "Rotation", "Wasteland", "MIR", "UID", "m", "d",
]);

function listJson(folder) {
  const files = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".json")) files.push(path.relative(folder, full).replaceAll(path.sep, "/"));
    }
  }
  visit(folder);
  return files.sort();
}

function leaves(value, prefix = "") {
  if (value === null || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, `${prefix}${Array.isArray(value) ? `[${key}]` : `.${key}`}`));
}

function tokens(value) {
  return [...String(value).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort().join("|");
}

function isIntentionallyUntranslated(relative, key, value) {
  if (EXPECTED_LITERAL.has(value)) return true;
  if (relative === "content/finalPlan.json" && key === ".languageModal.choices.en" && value === "English") return true;
  if (relative === "ui/header.json" && key.includes(".languageOptions.") && /\.(badge|label)$/.test(key)) return true;
  return false;
}

export function auditDraftLocales() {
  const files = listJson(SOURCE);
  const errors = [];
  const summaries = {};
  for (const lang of DRAFT_LANGS) {
    const target = path.join(ROOT, "src/i18n/locales", lang);
    const targetFiles = listJson(target);
    const sourceSet = new Set(files);
    const targetSet = new Set(targetFiles);
    for (const file of files) if (!targetSet.has(file)) errors.push(`${lang}: missing file ${file}`);
    for (const file of targetFiles) if (!sourceSet.has(file)) errors.push(`${lang}: extra file ${file}`);
    const pending = [];
    let translated = 0, invariant = 0, total = 0;
    for (const file of files.filter((item) => targetSet.has(item))) {
      const source = new Map(leaves(JSON.parse(fs.readFileSync(path.join(SOURCE, file), "utf8"))));
      const draft = new Map(leaves(JSON.parse(fs.readFileSync(path.join(target, file), "utf8"))));
      for (const key of source.keys()) if (!draft.has(key)) errors.push(`${lang}/${file}: missing key ${key}`);
      for (const key of draft.keys()) if (!source.has(key)) errors.push(`${lang}/${file}: extra key ${key}`);
      for (const [key, value] of source) {
        if (!draft.has(key)) continue;
        const localized = draft.get(key);
        if (typeof localized !== typeof value) errors.push(`${lang}/${file}:${key} type mismatch`);
        if (typeof value !== "string") continue;
        total++;
        if (typeof localized !== "string" || !localized.trim()) errors.push(`${lang}/${file}:${key} empty value`);
        if (tokens(value) !== tokens(localized)) errors.push(`${lang}/${file}:${key} placeholder mismatch`);
        if (value === localized) {
          if (isIntentionallyUntranslated(file, key, value)) invariant++;
          else pending.push(`${file}${key} :: ${value}`);
        } else translated++;
      }
    }
    summaries[lang] = { total, translated, invariant, pendingCount: pending.length, pending };
  }
  return { errors, summaries };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const { errors, summaries } = auditDraftLocales();
  for (const [lang, stats] of Object.entries(summaries)) {
    console.log(`STAGE060_${lang.toUpperCase()}: ${stats.translated}/${stats.total} translated; ${stats.invariant} invariant; ${stats.pendingCount} pending`);
    if (process.argv.includes("--list")) console.log(stats.pending.join("\n"));
  }
  if (errors.length) {console.error(errors.join("\n"));process.exitCode=1;}
  else if (process.argv.includes("--strict") && Object.values(summaries).some((item) => item.pendingCount)) {
    console.error("LOCALES_NOT_READY: DE/JA have untranslated values.");
    process.exitCode=1;
  } else console.log("STAGE060_DE_JA_TRANSLATIONS_OK");
}
