import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditDraftLocales } from "../scripts/audit-stage061-locales.mjs";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "../src/config/site.js";
import { getIntlLocale } from "../src/utils/intlLocale.js";
import { normalizeLanguage, getLanguagePath } from "../src/utils/language.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

// Prevent advertising a new route before ALL 19 files are actually complete.
test("061: simplified Chinese and Korean catalogs contain every key and placeholder", () => {
  const { errors, summaries } = auditDraftLocales();
  assert.deepEqual(errors, []);
  for (const code of ["zh", "ko"]) {
    assert.equal(summaries[code].total, 1595);
    assert.equal(summaries[code].pendingCount, 0);
    assert.ok(summaries[code].translated > 1500);
    const folder = path.join(ROOT, "src/i18n/locales", code);
    const files = fs.readdirSync(folder, { recursive: true }).filter((item) => item.endsWith(".json"));
    assert.equal(files.length, 19);
  }
});

test("061: all ten active languages and no languages remain planned", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
    assert.equal(LANGUAGES.zh.nativeLabel, "中文");
  assert.equal(LANGUAGES.ko.nativeLabel, "한국어");
  const i18n = read("src/i18n/index.js");
  const menu = read("src/components/BurgerMenu/BurgerMenu.jsx");
  for (const lang of ["zh", "ko"]) {
    assert.match(read(`public/images/final-plan/lang/${lang}.svg`), /<svg/);
    assert.ok(i18n.includes(`from "./locales/${lang}/`));
    const header = JSON.parse(read(`src/i18n/locales/${lang}/ui/header.json`));
    for (const [code, def] of Object.entries(LANGUAGES)) {
      assert.equal(header.languageOptions[code].label, def.nativeLabel);
    }
  }
  assert.match(menu, /SUPPORTED_LANGUAGES\.map/);
  assert.match(menu, /language-current/);
});

test("061: new locale paths, number formats and secret link navigation are preserved", () => {
  for (const [code, locale] of Object.entries({ zh: "zh-CN", ko: "ko-KR" })) {
    assert.equal(normalizeLanguage(`${code}-XX`), code);
    assert.equal(getIntlLocale(code), locale);
    assert.equal(getLanguagePath("/uk/players", code), `/${code}/players`);
    assert.equal(getLanguagePath("/uk/admin", code), `/${code}/admin`);
    assert.equal(getLanguagePath("/s/opaque-private-key", code), "/s/opaque-private-key");
    assert.equal(new Intl.NumberFormat(locale).format(1234567),
      new Intl.NumberFormat(getIntlLocale(code)).format(1234567));
    assert.ok(new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date("2026-10-30")));
  }
  assert.match(read("src/components/BurgerMenu/BurgerMenu.jsx"), /search:\s*location\.search/);
  assert.match(read("src/components/BurgerMenu/BurgerMenu.jsx"), /hash:\s*location\.hash/);
});

test("061: critical destructive confirmations are localized without altering exact confirmation tokens", () => {
  for (const code of ["zh", "ko"]) {
    const text = JSON.parse(read(`src/i18n/locales/${code}/admin/settings.json`));
    assert.equal(text.backup.restoreModal.phrase, "RESTORE REGION DATA");
    assert.equal(text.factoryReset.confirmation.phrase, "DELETE REGION DATA");
    assert.notEqual(text.factoryReset.warning.text,
      JSON.parse(read("src/i18n/locales/en/admin/settings.json")).factoryReset.warning.text);
  }
});

test("061: final-plan PNG/TXT internal language restrictions are unchanged", () => {
  const source = read("src/features/turrets/planLanguages.js");
  assert.match(source, /PLAN_LANGUAGE_CODES\s*=\s*Object\.freeze\(\["uk", "en"\]\)/);
  assert.doesNotMatch(source, /"zh"|"ko"/);
});
