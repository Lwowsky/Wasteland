import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUPPORTED_LANGUAGES } from "../src/config/site.js";
import { getLanguagePath, normalizeLanguage } from "../src/utils/language.js";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("060: all fully translated routes are enabled", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
  assert.equal(normalizeLanguage("ja", ""), "ja");
  assert.equal(normalizeLanguage("ru-RU", ""), "ru");
  assert.equal(normalizeLanguage("pl-PL", ""), "pl");
});

test("058: language menus use the existing flag images and provide ten active locales", () => {
  const menu = read("src/components/BurgerMenu/BurgerMenu.jsx");
  assert.match(menu, /SUPPORTED_LANGUAGES\.map/);
  assert.match(menu, /aria-pressed/);
  assert.match(menu, /location\.search/);
  assert.match(menu, /location\.hash/);
  for (const code of SUPPORTED_LANGUAGES) {
    assert.ok(read(`public/images/final-plan/lang/${code}.svg`).includes("<svg"));
    for (const lang of SUPPORTED_LANGUAGES) {
      const copy = JSON.parse(read(`src/i18n/locales/${lang}/ui/header.json`));
      assert.ok(copy.languageOptions[code]?.label);
    }
  }
});

test("058: language change retains original route and query/hash details", () => {
  assert.equal(getLanguagePath("/uk/players", "en"), "/en/players");
  assert.equal(getLanguagePath("/s/private-short-code", "en"), "/s/private-short-code");
  assert.match(read("src/pages/Settings/Settings.jsx"), /search: location\.search/);
});
