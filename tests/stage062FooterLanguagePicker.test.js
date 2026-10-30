import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { LANGUAGES, SUPPORTED_LANGUAGES } from "../src/config/site.js";
import {
  createFooterDrafts, buildFooterOverrides,
} from "../src/features/site/footerSettings.js";
import { sanitizeFooterByLanguage } from "../worker/src/db/siteSettings.js";
import { auditStage062Locales } from "../scripts/audit-stage062-locales.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const translations = Object.fromEntries(SUPPORTED_LANGUAGES.map((language) => [
  language, { footer: JSON.parse(fs.readFileSync(
    path.join(ROOT, "src/i18n/locales", language, "ui/footer.json"), "utf8")) },
]));
const EDITOR = fs.readFileSync(path.join(ROOT, "src/pages/Admin/settings/SiteFooterFields.jsx"), "utf8");
const STYLE = fs.readFileSync(path.join(ROOT, "src/pages/Admin/settings/SiteIdentity.css"), "utf8");

test("062: footer editor lists every active locale with its own name and real site flag", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
  for (const language of SUPPORTED_LANGUAGES) {
    assert.ok(LANGUAGES[language].nativeLabel);
    assert.ok(fs.existsSync(path.join(ROOT, `public/images/final-plan/lang/${language}.svg`)));
    assert.ok(translations[language]?.footer?.description);
  }
  assert.match(EDITOR, /SUPPORTED_LANGUAGES\.map/);
  assert.match(EDITOR, /nativeLabel/);
  assert.match(EDITOR, /role=|<select/);
  assert.match(EDITOR, /setActiveLanguage\(event\.target\.value\)/);
  assert.match(EDITOR, /publicAsset\(`\/images\/final-plan\/lang\/\$\{activeLanguage\}\.svg`\)/);
  assert.match(STYLE, /\.site-identity-language-picker/);
  assert.doesNotMatch(EDITOR, /site-identity-language-tabs/);
});

test("062: editing one of ten footer languages preserves other active locale overrides", () => {
  const settings = { footerByLanguage: {
    uk: { description: "Існуючий український текст" },
    ko: { projectDescription: "한국어 사용자 설정" },
    vi: { authorLabel: "Tác giả tùy chỉnh" },
    ar: { description: "وصف مخصص سابق" },
  } };
  const drafts = createFooterDrafts(settings, translations, SUPPORTED_LANGUAGES);
  drafts.ja.description = "日本語の説明";
  const overrides = buildFooterOverrides(drafts, settings, translations, SUPPORTED_LANGUAGES);
  assert.equal(overrides.uk.description, settings.footerByLanguage.uk.description);
  assert.equal(overrides.ko.projectDescription, settings.footerByLanguage.ko.projectDescription);
  assert.equal(overrides.vi.authorLabel, settings.footerByLanguage.vi.authorLabel);
  assert.equal(overrides.ar.description, settings.footerByLanguage.ar.description);
  assert.equal(overrides.ja.description, "日本語の説明");
  assert.deepEqual(sanitizeFooterByLanguage(overrides), overrides);
});

test("062: complete Vietnamese/Arabic dictionaries are active with matching key shapes", () => {
  const report = auditStage062Locales();
  assert.deepEqual(report.errors, []);
    for (const code of ["vi", "ar"]) {
    assert.ok(SUPPORTED_LANGUAGES.includes(code));
    assert.equal(report.summaries[code].total, 1595);
    assert.equal(report.summaries[code].pending.length, 0);
  }
});
