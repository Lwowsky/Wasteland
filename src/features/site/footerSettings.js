import { SITE_FOOTER_FIELDS } from "../../../shared/siteSettingsConfig.js";

/**
 * JSON locale text is the default. Only non-empty D1 overrides replace it.
 * Older saved rows may contain empty strings for every field: treat these as
 * "no override", not as instructions to erase the visible footer.
 */
export function resolveEffectiveFooter(baseCopy = {}, overrides = {}) {
  return Object.fromEntries(
    SITE_FOOTER_FIELDS.map((field) => {
      const custom = overrides?.[field];
      const fallback = baseCopy?.[field];
      return [
        field,
        typeof custom === "string" && custom.trim()
          ? custom
          : typeof fallback === "string"
            ? fallback
            : "",
      ];
    }),
  );
}

/** The admin form displays exactly what the public footer currently shows. */
export function createFooterDrafts(settings, translations, languages) {
  return Object.fromEntries(
    languages.map((language) => [
      language,
      resolveEffectiveFooter(
        translations[language]?.footer,
        settings?.footerByLanguage?.[language],
      ),
    ]),
  );
}

/**
 * Store only differences from the locale defaults. Never send empty fields:
 * clearing a field means falling back to its JSON translation. Preserve any
 * overrides for languages not currently supported by this frontend.
 */
export function buildFooterOverrides(drafts, settings, translations, languages) {
  const stored = settings?.footerByLanguage || {};
  const overrides = Object.fromEntries(
    Object.entries(stored).filter(([language]) => !languages.includes(language)),
  );

  for (const language of languages) {
    const base = translations[language]?.footer || {};
    const fields = drafts[language] || {};
    const changes = {};

    for (const field of SITE_FOOTER_FIELDS) {
      const value = String(fields[field] ?? "").trim();
      const defaultValue = String(base[field] ?? "").trim();
      if (value && value !== defaultValue) {
        changes[field] = value;
      }
    }

    if (Object.keys(changes).length) {
      overrides[language] = changes;
    }
  }

  return overrides;
}
