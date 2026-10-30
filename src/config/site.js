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
  ru: {
    code: "ru", label: "RU", nativeLabel: "Русский", englishLabel: "Russian", badge: "RU",
  },
  pl: {
    code: "pl", label: "PL", nativeLabel: "Polski", englishLabel: "Polish", badge: "PL",
  },
  de: {
    code: "de", label: "DE", nativeLabel: "Deutsch", englishLabel: "German", badge: "DE",
  },
  ja: {
    code: "ja", label: "JA", nativeLabel: "日本語", englishLabel: "Japanese", badge: "JA",
  },
  zh: {
    code: "zh", label: "ZH", nativeLabel: "中文", englishLabel: "Chinese (Simplified)", badge: "ZH",
  },
  ko: {
    code: "ko", label: "KO", nativeLabel: "한국어", englishLabel: "Korean", badge: "KO",
  },
  vi: {
    code: "vi", label: "VI", nativeLabel: "Tiếng Việt", englishLabel: "Vietnamese", badge: "VI",
  },
  ar: {
    code: "ar", label: "AR", nativeLabel: "العربية", englishLabel: "Arabic", badge: "AR",
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);

