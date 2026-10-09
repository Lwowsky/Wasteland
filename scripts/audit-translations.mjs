import fs from "node:fs";
import path from "node:path";

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

const errors = [...auditLocaleParity(), ...auditDirectJsxText()];

if (errors.length) {
  console.error("Translation audit failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("TRANSLATIONS_OK");
