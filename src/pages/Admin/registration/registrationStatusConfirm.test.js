import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { getRegistrationConfirmContent } from "./registrationSettingsAdmin.js";

const readLocale = (lang) => JSON.parse(
  readFileSync(new URL(`../../../i18n/locales/${lang}/admin/registration.json`, import.meta.url), "utf8"),
);

for (const lang of ["uk", "en"]) {
  test(`${lang}: closing requires explicit confirmation with a matching action`, () => {
    const translations = readLocale(lang);
    const content = getRegistrationConfirmContent({ kind: "status", closing: true }, translations);
    assert.equal(content.primaryLabel, translations.sections.cycle.closeRegistration);
    assert.equal(content.title, translations.confirm.closeRegistrationTitle);
    assert.ok(content.details.length > 0);
  });
  test(`${lang}: reopening requires explicit confirmation`, () => {
    const translations = readLocale(lang);
    const content = getRegistrationConfirmContent({ kind: "status", closing: false }, translations);
    assert.equal(content.primaryLabel, translations.sections.cycle.openRegistration);
    assert.equal(content.title, translations.confirm.openRegistrationTitle);
  });
}
