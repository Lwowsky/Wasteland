import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFooterOverrides,
  createFooterDrafts,
  resolveEffectiveFooter,
} from "../src/features/site/footerSettings.js";
import {
  getSiteSettings,
  sanitizeFooterByLanguage,
  saveSiteSettings,
} from "../worker/src/db/siteSettings.js";

const languages = ["uk", "en"];
const translations = {
  uk: {
    footer: {
      description: "Початковий опис",
      authorLabel: "Про автора",
      author: "Lwowsky",
      authorDescription: "Опис автора",
      projectDescription: "Проєкт",
      copyright: "© Проєкт",
    },
  },
  en: {
    footer: {
      description: "Default description",
      authorLabel: "About the author",
      author: "Lwowsky",
      authorDescription: "Author description",
      projectDescription: "Project",
      copyright: "© Project",
    },
  },
};

test("footer: empty legacy D1 fields fall back to JSON while real overrides remain", () => {
  const settings = {
    footerByLanguage: {
      uk: { description: "", author: "Оновлений автор", copyright: "  " },
      en: { description: "Custom English text" },
    },
  };
  const draft = createFooterDrafts(settings, translations, languages);
  assert.equal(draft.uk.description, "Початковий опис");
  assert.equal(draft.uk.author, "Оновлений автор");
  assert.equal(draft.uk.copyright, "© Проєкт");
  assert.equal(draft.en.description, "Custom English text");
  assert.equal(draft.en.authorLabel, "About the author");
});

test("footer: empty saved texts are not rendered as blank content", () => {
  const copy = resolveEffectiveFooter(translations.uk.footer, {
    description: "",
    author: "    ",
    copyright: "© Особистий сайт",
  });
  assert.equal(copy.description, "Початковий опис");
  assert.equal(copy.author, "Lwowsky");
  assert.equal(copy.copyright, "© Особистий сайт");
});

test("footer: editing one Ukrainian field does not freeze the other defaults", () => {
  const initial = createFooterDrafts({}, translations, languages);
  const edited = {
    ...initial,
    uk: { ...initial.uk, description: "Мій власний футер" },
  };
  assert.deepEqual(buildFooterOverrides(edited, {}, translations, languages), {
    uk: { description: "Мій власний футер" },
  });
});

test("footer: restoring one language removes its overrides and preserves another language", () => {
  const settings = {
    footerByLanguage: {
      uk: { author: "Інший автор" },
      en: { description: "Edited English" },
      de: { description: "Deutsch" },
    },
  };
  const draft = createFooterDrafts(settings, translations, languages);
  draft.uk = resolveEffectiveFooter(translations.uk.footer);
  assert.deepEqual(buildFooterOverrides(draft, settings, translations, languages), {
    de: { description: "Deutsch" },
    en: { description: "Edited English" },
  });
});

test("footer: a cleared field saves as locale fallback, not an empty override", () => {
  const settings = { footerByLanguage: { uk: { author: "Some custom author" } } };
  const draft = createFooterDrafts(settings, translations, languages);
  draft.uk.author = "";
  assert.deepEqual(buildFooterOverrides(draft, settings, translations, languages), {});
});

test("footer: Worker keeps only safe, non-empty overrides", () => {
  const result = sanitizeFooterByLanguage({
    uk: { description: "  Привіт  ", author: "", copyright: "   ", ignored: "evil" },
    en: { authorLabel: "  About us " },
    de: { description: "   " },
    "bad!!": { author: "Bad" },
  });
  assert.deepEqual(result, {
    uk: { description: "Привіт" },
    en: { authorLabel: "About us" },
  });
});

test("footer: simulated D1 read/write keeps sparse fields without resetting other defaults", async () => {
  let row = {
    siteName: "Wasteland King",
    brandText: "Wasteland King",
    regionNumber: 987,
    regionName: "We are One",
    footerJson: JSON.stringify({ uk: { author: "", description: "Старий опис" } }),
    updatedAt: "2026-10-10",
  };
  const env = {
    DB: {
      prepare(sql) {
        return {
          async first() {
            assert.match(sql, /SELECT/);
            return row;
          },
          bind(siteName, brandText, regionNumber, regionName, footerJson) {
            return {
              async run() {
                row = {
                  siteName,
                  brandText,
                  regionNumber,
                  regionName,
                  footerJson,
                  updatedAt: "2026-10-11",
                };
              },
            };
          },
        };
      },
    },
  };

  const current = await getSiteSettings(env);
  assert.deepEqual(current.footerByLanguage, { uk: { description: "Старий опис" } });
  const draft = createFooterDrafts(current, translations, languages);
  draft.uk.description = "Новий опис";
  const saved = await saveSiteSettings(env, {
    ...current,
    footerByLanguage: buildFooterOverrides(draft, current, translations, languages),
  });
  assert.deepEqual(saved.footerByLanguage, { uk: { description: "Новий опис" } });
  assert.equal(saved.siteName, current.siteName);
  assert.equal(saved.regionNumber, current.regionNumber);
});
