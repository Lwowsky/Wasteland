import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditDraftLocales } from "../scripts/audit-stage060-locales.mjs";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "../src/config/site.js";
import { getIntlLocale } from "../src/utils/intlLocale.js";
import { getLanguagePath, normalizeLanguage } from "../src/utils/language.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (name) => fs.readFileSync(path.join(ROOT, name), "utf8");

// Guard against adding a locale to navigation before its *entire* catalog is ready.
test("060: German and Japanese have all 19 files, keys, types and interpolation placeholders", () => {
  const { errors, summaries } = auditDraftLocales();
  assert.deepEqual(errors, []);
  for (const language of ["de", "ja"]) {
    assert.equal(summaries[language].total, 1595);
    assert.equal(summaries[language].pendingCount, 0);
    assert.ok(summaries[language].translated > 1400);
    const folder = path.join(ROOT, "src/i18n/locales", language);
    const all = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (full.endsWith(".json")) all.push(full);
      }
    };
    walk(folder);
    assert.equal(all.length, 19);
  }
});

test("060: only tested languages become active, with their own native names and flags", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
    const index = load("src/i18n/index.js");
  const menu = load("src/components/BurgerMenu/BurgerMenu.jsx");
  for (const code of SUPPORTED_LANGUAGES) {
    assert.match(load(`public/images/final-plan/lang/${code}.svg`), /<svg/);
    assert.ok(index.includes(`from "./locales/${code}/`));
    const header = JSON.parse(load(`src/i18n/locales/${code}/ui/header.json`));
    for (const key of Object.keys(LANGUAGES)) {
      assert.equal(header.languageOptions[key].label, LANGUAGES[key].nativeLabel);
    }
  }
  assert.match(menu, /SUPPORTED_LANGUAGES\.map/);
  assert.match(menu, /language-current/);
});

test("060: German and Japanese routes and Intl date/number locales are correct", () => {
  for (const [code, locale] of Object.entries({ de: "de-DE", ja: "ja-JP" })) {
    assert.equal(getIntlLocale(code), locale);
    assert.equal(normalizeLanguage(`${code}-XX`), code);
    assert.equal(new Intl.NumberFormat(getIntlLocale(code)).format(1234567),
      new Intl.NumberFormat(locale).format(1234567));
    assert.ok(new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date("2026-10-30")));
    assert.equal(getLanguagePath("/uk/players", code), `/${code}/players`);
    assert.equal(getLanguagePath("/s/private-secret", code), "/s/private-secret");
  }
  assert.equal(getIntlLocale("unknown"), "en-GB");
});

test("060: plan export remains EN/UA only until separate Worker-safe upgrade", () => {
  const source = load("src/features/turrets/planLanguages.js");
  assert.match(source, /PLAN_LANGUAGE_CODES\s*=\s*Object\.freeze\(\["uk", "en"\]\)/);
  assert.doesNotMatch(source, /"de"|"ja"/);
  const modal = load("src/pages/FinalPlan/components/FinalPlanLanguageModal.jsx");
  assert.match(modal, /translations\[language\]/);
});

test("060: no frontend locale changes affect Worker or registration data", () => {
  const config = load("src/config/site.js");
  assert.match(config, /de:\s*\{/);
  assert.match(config, /ja:\s*\{/);
  // Public language switching preserves the opaque query/hash rather than stripping access links.
  const menu = load("src/components/BurgerMenu/BurgerMenu.jsx");
  assert.match(menu, /search:\s*location\.search/);
  assert.match(menu, /hash:\s*location\.hash/);
});
