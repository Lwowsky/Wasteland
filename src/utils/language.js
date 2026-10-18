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

  try {
    return normalizeLanguage(
      window.localStorage.getItem(PREFERRED_LANGUAGE_STORAGE_KEY),
      "",
    );
  } catch {
    // Browser privacy settings can forbid storage. Language routing must survive.
    return "";
  }
}

export function savePreferredLanguage(language) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      PREFERRED_LANGUAGE_STORAGE_KEY,
      normalizeLanguage(language),
    );
  } catch {
    // Language choice still works for this navigation without persistent storage.
  }
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
  const path = String(pathname || "/");
  const absolute = path.startsWith("/") ? path : `/${path}`;
  const parts = absolute.split("/");

  // Canonical language-prefixed routes: replace only the existing prefix.
  if (SUPPORTED_LANGUAGES.includes(parts[1])) {
    parts[1] = nextLanguage;
    return parts.join("/");
  }

  // Share links are opaque capability URLs, never language-prefixed.
  if (parts[1] === "s" && parts[2]) return absolute;

  // /players, /final-plan, /registration etc. must keep their full path.
  return `/${nextLanguage}${absolute === "/" ? "" : absolute}`;
}
