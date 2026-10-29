import { DEFAULT_SITE_SETTINGS } from "../../shared/siteSettingsConfig.js";

export const SITE_NAME = DEFAULT_SITE_SETTINGS.siteName;

export const SITE_URL = (import.meta.env?.VITE_SITE_URL || "").replace(/\/$/, "");

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = {
  uk: {
    code: "uk",
    label: "UA",
    nativeLabel: "Українська",
    englishLabel: "Ukrainian",
    badge: "UA",
  },

  en: {
    code: "en",
    label: "EN",
    nativeLabel: "English",
    englishLabel: "English",
    badge: "EN",
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);

// Languages from the legacy website are listed for future localization work.
// They are intentionally NOT supported routes until every JSON catalog is ready.
export const PLANNED_LANGUAGES = Object.freeze(["ru", "pl", "de", "ja", "zh", "ko", "vi", "ar"]);
