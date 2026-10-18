import { findDuplicateJsonKeys } from "./audit-json-duplicate-keys.mjs";
import { auditStaticTranslationAccesses } from "./audit-i18n-static-access.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const LOCALES_ROOT = path.join(ROOT, "src", "i18n", "locales");
const SRC_ROOT = path.join(ROOT, "src");
const LANGUAGES = ["en", "uk"];
const ALLOWED_RAW_UI = new Set(["G"]);

function walk(dir, predicate = () => true) {
  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }

  return result;
}

function flattenKeys(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function flattenValues(value, prefix = "") {
  if (typeof value === "string") return [[prefix, value]];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenValues(child, prefix ? `${prefix}.${key}` : key),
  );
}

export function translationPlaceholders(value) {
  return [...String(value).matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)]
    .map((match) => match[1]).sort();
}

export function compareTranslationStrings(base, compare, localeFile) {
  const errors = [];
  const baseText = new Map(flattenValues(base));
  const compareText = new Map(flattenValues(compare));
  for (const [key, text] of baseText) {
    if (!compareText.has(key)) continue;
    const baseParams = translationPlaceholders(text);
    const translatedParams = translationPlaceholders(compareText.get(key));
    if (baseParams.join("|") !== translatedParams.join("|")) {
      errors.push(`${localeFile}: placeholder mismatch in ${key}: ` +
        `base [${baseParams.join(", ")}], translation [${translatedParams.join(", ")}]`);
    }
  }
  return errors;
}

export function compareTranslationArrayShapes(base, compare, localeFile) {
  const errors = [];
  function inspect(left, right, prefix) {
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        errors.push(`${localeFile}: mismatched translated array ${prefix}`);
      }
      return;
    }
    if (!left || typeof left !== "object" || !right || typeof right !== "object") return;
    for (const [key, value] of Object.entries(left)) {
      if (Object.hasOwn(right, key)) {
        inspect(value, right[key], prefix ? `${prefix}.${key}` : key);
      }
    }
  }
  inspect(base, compare, "");
  return errors;
}

function relativeLocaleFiles(language) {
  const root = path.join(LOCALES_ROOT, language);

  return walk(root, (file) => file.endsWith(".json"))
    .map((file) => path.relative(root, file).replaceAll(path.sep, "/"))
    .sort();
}

function auditLocaleParity() {
  const [baseLanguage, compareLanguage] = LANGUAGES;
  const baseFiles = relativeLocaleFiles(baseLanguage);
  const compareFiles = relativeLocaleFiles(compareLanguage);
  const errors = [];

  for (const file of new Set([...baseFiles, ...compareFiles])) {
    if (!baseFiles.includes(file)) {
      errors.push(`${baseLanguage}: missing file ${file}`);
      continue;
    }

    if (!compareFiles.includes(file)) {
      errors.push(`${compareLanguage}: missing file ${file}`);
      continue;
    }

    const base = JSON.parse(
      fs.readFileSync(path.join(LOCALES_ROOT, baseLanguage, file), "utf8"),
    );
    const compare = JSON.parse(
      fs.readFileSync(path.join(LOCALES_ROOT, compareLanguage, file), "utf8"),
    );
    const baseKeys = new Set(flattenKeys(base));
    const compareKeys = new Set(flattenKeys(compare));
    errors.push(...compareTranslationStrings(base, compare, file));
    errors.push(...compareTranslationArrayShapes(base, compare, file));
    for (const [key, value] of flattenValues(base)) {
      if (!value.trim()) errors.push(`${baseLanguage}: ${file} empty translation ${key}`);
    }
    for (const [key, value] of flattenValues(compare)) {
      if (!value.trim()) errors.push(`${compareLanguage}: ${file} empty translation ${key}`);
    }

    for (const key of baseKeys) {
      if (!compareKeys.has(key)) {
        errors.push(`${compareLanguage}: ${file} missing key ${key}`);
      }
    }

    for (const key of compareKeys) {
      if (!baseKeys.has(key)) {
        errors.push(`${baseLanguage}: ${file} missing key ${key}`);
      }
    }
  }

  return errors;
}

function isAllowedRawUi(value) {
  const normalized = value.trim();

  return (
    ALLOWED_RAW_UI.has(normalized) ||
    /^T\d{1,2}$/.test(normalized)
  );
}

function auditDirectJsxText() {
  const errors = [];
  const files = walk(SRC_ROOT, (file) => file.endsWith(".jsx"));
  const visibleAttributes = ["alt", "title", "placeholder", "aria-label"];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      const textMatch = line.match(/<[^>]+>\s*([^<{][^<{}]*[A-Za-zА-Яа-яІіЇїЄє][^<{}]*)\s*<\//u);

      if (textMatch) {
        const value = textMatch[1].trim();

        if (value && !isAllowedRawUi(value)) {
          errors.push(
            `${path.relative(ROOT, file)}:${index + 1} raw JSX text: ${JSON.stringify(value)}`,
          );
        }
      }

      for (const attribute of visibleAttributes) {
        const regex = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']*[A-Za-zА-Яа-яІіЇїЄє][^"']*)["']`, "u");
        const match = line.match(regex);

        if (match && !isAllowedRawUi(match[1])) {
          errors.push(
            `${path.relative(ROOT, file)}:${index + 1} raw ${attribute}: ${JSON.stringify(match[1])}`,
          );
        }
      }
    });
  }

  return errors;
}

function auditDuplicateTranslationKeys() {
  const errors = [];
  for (const language of LANGUAGES) {
    for (const file of relativeLocaleFiles(language)) {
      const source = fs.readFileSync(path.join(LOCALES_ROOT, language, file), "utf8");
      for (const duplicate of findDuplicateJsonKeys(source)) {
        errors.push(`${language}/${file}:${duplicate.line}: duplicate JSON key ${duplicate.key}`);
      }
    }
  }
  return errors;
}

function auditCatalogLeafTypes() {
  const errors = [];
  for (const language of LANGUAGES) {
    for (const file of relativeLocaleFiles(language)) {
      const catalog = JSON.parse(fs.readFileSync(path.join(LOCALES_ROOT, language, file), "utf8"));
      function inspect(value, key = "") {
        if (typeof value === "string") return;
        if (Array.isArray(value)) {
          if (!value.length || value.some((item) => typeof item !== "string" || !item.trim())) {
            errors.push(`${language}/${file}: ${key} must be a nonempty array of translated strings`);
          }
          return;
        }
        if (!value || typeof value !== "object") {
          errors.push(`${language}/${file}: ${key} must be a string, translated string array or nested object`);
          return;
        }
        for (const [child, nested] of Object.entries(value)) {
          inspect(nested, key ? `${key}.${child}` : child);
        }
      }
      inspect(catalog);
    }
  }
  return errors;
}

export function runTranslationAudit() {
  return [
    ...auditDuplicateTranslationKeys(),
    ...auditLocaleParity(),
    ...auditCatalogLeafTypes(),
    ...auditDirectJsxText(),
    ...auditStaticTranslationAccesses(),
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = runTranslationAudit();
  if (errors.length) {
    console.error("Translation audit failed:\n");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log("TRANSLATIONS_OK");
  }
}
