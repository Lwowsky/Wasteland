import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "../src/config/site.js";
import { normalizeLanguage, getLanguagePath } from "../src/utils/language.js";
import { getIntlLocale } from "../src/utils/intlLocale.js";
import { auditStage062Locales } from "../scripts/audit-stage062-locales.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

test("062B: all 10 interface languages are available, with VI and AR routes", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
  for (const language of SUPPORTED_LANGUAGES) {
    assert.ok(LANGUAGES[language]?.nativeLabel);
    assert.ok(read(`public/images/final-plan/lang/${language}.svg`).includes("<svg"));
  }
  assert.equal(normalizeLanguage("vi-VN"), "vi");
  assert.equal(normalizeLanguage("ar-SA"), "ar");
  assert.equal(getLanguagePath("/en/admin", "ar"), "/ar/admin");
  assert.equal(getLanguagePath("/en/registration", "vi"), "/vi/registration");
  assert.equal(getLanguagePath("/s/private-token", "ar"), "/s/private-token");
  assert.equal(getIntlLocale("vi"), "vi-VN");
  assert.equal(getIntlLocale("ar-SA"), "ar-SA");
});

test("062B: both complete catalogs have valid placeholders and exact confirmation codes", () => {
  const result = auditStage062Locales();
  assert.deepEqual(result.errors, []);
  for (const language of ["vi", "ar"]) {
    assert.equal(result.summaries[language].total, 1603);
    assert.equal(result.summaries[language].pending.length, 0);
    assert.equal(result.summaries[language].invariant, 49);
    const settings = json(`src/i18n/locales/${language}/admin/settings.json`);
    assert.equal(settings.backup.restoreModal.phrase, "RESTORE REGION DATA");
    assert.equal(settings.factoryReset.confirmation.phrase, "DELETE REGION DATA");
    assert.notEqual(settings.factoryReset.warning.text,
      json("src/i18n/locales/en/admin/settings.json").factoryReset.warning.text);
  }
});

test("062B: document lang and direction update and reset across routed pages", () => {
  const layout = read("src/layouts/MainLayout.jsx");
  assert.match(layout, /document\.documentElement\.lang = language/);
  assert.match(layout, /document\.documentElement\.dir = language === "ar" \? "rtl" : "ltr"/);
  assert.match(layout, /document\.documentElement\.removeAttribute\("dir"\)/);
  assert.match(read("src/styles/global.css"), /:root\[dir="rtl"\]/);
  assert.match(read("src/components/BurgerMenu/BurgerMenu.css"), /inset-inline-end:\s*0/);
  assert.match(read("src/pages/Admin/settings/SiteFooterFields.jsx"), /dir="auto"/);
});

test("062B: production catalog no longer depends on translation draft folder", () => {
  assert.ok(!fs.existsSync(path.join(root, "localization/stage062-drafts")));
  assert.ok(!fs.existsSync(path.join(root, "scripts/audit-stage062-drafts.mjs")));
  assert.match(read("src/i18n/index.js"), /from "\.\/locales\/vi\/admin\/settings\.json"/);
  assert.match(read("src/i18n/index.js"), /from "\.\/locales\/ar\/admin\/settings\.json"/);
  assert.match(read("src/components/BurgerMenu/BurgerMenu.jsx"), /SUPPORTED_LANGUAGES\.map/);
  assert.doesNotMatch(read("src/components/BurgerMenu/BurgerMenu.jsx"), /languages-future/);
});
