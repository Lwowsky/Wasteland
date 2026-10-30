import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getIntlLocale } from "../src/utils/intlLocale.js";
import { formatDate, formatNumericDateTime } from "../src/utils/date.js";
import { formatMarch } from "../src/utils/formatMarch.js";
import { normalizeLanguage, getLanguagePath } from "../src/utils/language.js";
import { SUPPORTED_LANGUAGES } from "../src/config/site.js";

const root = path.resolve(import.meta.dirname, "..");

test("061: internationalized dates and numbers follow all ten language codes", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
  const expected = { uk: "uk-UA", en: "en-GB", ru: "ru-RU", pl: "pl-PL", de: "de-DE", ja: "ja-JP", zh: "zh-CN", ko: "ko-KR", vi: "vi-VN", ar: "ar-SA" };
  for (const [language, locale] of Object.entries(expected)) {
    assert.equal(getIntlLocale(language), locale);
    assert.equal(getIntlLocale(`${language}-x`), locale);
    assert.equal(formatMarch(1234567, language), new Intl.NumberFormat(locale).format(1234567));
    const d = new Date("2026-10-30T00:00:00Z");
    assert.equal(formatDate(d, language, "UTC"),
      new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d));
    assert.ok(formatNumericDateTime(d, language, "UTC"));
  }
  assert.equal(getIntlLocale("unknown"), "en-GB");
});

test("059: Russian and Polish routing changes preserve opaque links", () => {
  assert.equal(normalizeLanguage("ru-RU"), "ru");
  assert.equal(normalizeLanguage("pl_PL"), "pl");
  assert.equal(normalizeLanguage("de-DE"), "de");
  assert.equal(normalizeLanguage("ja_JP"), "ja");
  assert.equal(normalizeLanguage("zh-CN"), "zh");
  assert.equal(normalizeLanguage("ko_KR"), "ko");
  assert.equal(normalizeLanguage("vi_VN"), "vi");
  assert.equal(normalizeLanguage("ar_SA"), "ar");
  assert.equal(getLanguagePath("/uk/players", "ru"), "/ru/players");
  assert.equal(getLanguagePath("/pl/admin", "en"), "/en/admin");
  assert.equal(getLanguagePath("/s/opaque-link", "ru"), "/s/opaque-link");
  });

test("059: final-plan settings modal follows the current interface language", () => {
  const source = fs.readFileSync(path.join(root, "src/pages/FinalPlan/components/FinalPlanLanguageModal.jsx"), "utf8");
  assert.match(source, /translations\[language\]/);
  assert.doesNotMatch(source, /language === "en" \? en : uk/);
});
