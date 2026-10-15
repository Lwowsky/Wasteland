import assert from "node:assert/strict";
import test from "node:test";

import {
  createSiteIdentityDraft,
  canSaveSiteIdentity,
  buildSiteIdentityPayload,
} from "../src/pages/Admin/settings/siteIdentityDraft.js";

const languages = ["uk", "en"];
const translations = {
  uk: { footer: { description: "Опис", author: "Автор", copyright: "2026" } },
  en: { footer: { description: "Description", author: "Author", copyright: "2026" } },
};
const settings = {
  siteName: "Wasteland",
  brandText: "King",
  regionNumber: 987,
  regionName: "MIR",
  footerByLanguage: { uk: { author: "Vova" }, ja: { author: "Kept" } },
};

test("stage 6: identity draft fills region inputs and locale footer values from settings", () => {
  const draft = createSiteIdentityDraft(settings, translations, languages);
  assert.equal(draft.regionNumber, "987");
  assert.equal(draft.brandText, "King");
  assert.equal(draft.footerByLanguage.uk.description, "Опис");
  assert.equal(draft.footerByLanguage.uk.author, "Vova");
  assert.equal(draft.footerByLanguage.en.author, "Author");
});

test("stage 6: identity draft preserves blank form defaults", () => {
  const draft = createSiteIdentityDraft(null, translations, languages);
  assert.equal(draft.siteName, "");
  assert.equal(draft.regionNumber, "");
  assert.equal(draft.footerByLanguage.en.description, "Description");
});

test("stage 6: identity settings permit only valid numeric region within bounds", () => {
  const draft = createSiteIdentityDraft(settings, translations, languages);
  assert.equal(canSaveSiteIdentity(draft), true);
  assert.equal(canSaveSiteIdentity({ ...draft, regionNumber: "0" }), false);
  assert.equal(canSaveSiteIdentity({ ...draft, regionNumber: "100000" }), false);
  assert.equal(canSaveSiteIdentity({ ...draft, regionNumber: "1.1" }), false);
  assert.equal(canSaveSiteIdentity({ ...draft, regionNumber: "not-number" }), false);
  assert.equal(canSaveSiteIdentity({ ...draft, regionNumber: "1" }), true);
  assert.equal(canSaveSiteIdentity({ ...draft, regionNumber: "99999" }), true);
});

test("stage 6: identity form rejects blank names and brand independently", () => {
  const draft = createSiteIdentityDraft(settings, translations, languages);
  for (const field of ["siteName", "brandText", "regionName"]) {
    assert.equal(canSaveSiteIdentity({ ...draft, [field]: "   " }), false, field);
  }
});

test("stage 6: save payload sends numeric region and retains unsupported locale overrides", () => {
  const draft = createSiteIdentityDraft(settings, translations, languages);
  const saved = buildSiteIdentityPayload(draft, settings, translations, languages);
  assert.equal(saved.regionNumber, 987);
  assert.deepEqual(saved.footerByLanguage.uk, { author: "Vova" });
  assert.equal(saved.footerByLanguage.ja.author, "Kept");
  assert.equal(saved.footerByLanguage.en, undefined);
});

test("stage 6: footer defaults are not persisted as redundant overrides", () => {
  const draft = createSiteIdentityDraft(settings, translations, languages);
  draft.footerByLanguage.uk.author = "Автор";
  draft.footerByLanguage.en.description = "New English description";
  const saved = buildSiteIdentityPayload(draft, settings, translations, languages);
  assert.equal(saved.footerByLanguage.uk, undefined);
  assert.deepEqual(saved.footerByLanguage.en, { description: "New English description" });
  assert.equal(settings.footerByLanguage.uk.author, "Vova");
});
