import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../config/site.js";

export const PREFERRED_LANGUAGE_STORAGE_KEY = "wasteland-language";

function normalizeCandidateLanguage(language) {
  return String(language || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .split("-")[0];
}

export function normalizeLanguage(language, fallback = DEFAULT_LANGUAGE) {
  const candidate = normalizeCandidateLanguage(language);
  return SUPPORTED_LANGUAGES.includes(candidate) ? candidate : fallback;
}

export function getStoredLanguage() {
  if (typeof window === "undefined") {
    return "";
  }

  return normalizeLanguage(
    window.localStorage.getItem(PREFERRED_LANGUAGE_STORAGE_KEY),
    "",
  );
}

export function savePreferredLanguage(language) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PREFERRED_LANGUAGE_STORAGE_KEY,
    normalizeLanguage(language),
  );
}

export function getBrowserLanguage() {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
    navigator.userLanguage,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate, "");

    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function resolvePreferredLanguage() {
  return getStoredLanguage() || getBrowserLanguage() || DEFAULT_LANGUAGE;
}

export function getLanguagePath(pathname, newLanguage) {
  const nextLanguage = normalizeLanguage(newLanguage);
  const parts = pathname.split("/");

  parts[1] = nextLanguage;

  return parts.join("/");
}
