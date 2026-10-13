import { DEFAULT_SITE_SETTINGS } from "../../shared/siteSettingsConfig.js";

export const SITE_NAME = DEFAULT_SITE_SETTINGS.siteName;

export const SITE_URL = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "");

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = {
  uk: {
    code: "uk",
    label: "UA",
  },

  en: {
    code: "en",
    label: "EN",
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);
