// Shared by the browser and the Worker. The order also defines consistent plan labels.
// Do not import browser-only i18n modules here: the Worker validates published snapshots.
export const PLAN_LANGUAGE_CODES = Object.freeze([
  "uk", "en", "ru", "pl", "de", "ja", "zh", "ko", "vi", "ar",
]);
export const DEFAULT_PLAN_LANGUAGES = Object.freeze(["uk", "en"]);

// English stays mandatory for cross-alliance readability. All other languages
// are optional, and unknown/untrusted codes must not enter a public snapshot.
export function normalizePlanLanguages(codes) {
  const wanted = new Set(Array.isArray(codes) ? codes : []);
  wanted.add("en");
  return PLAN_LANGUAGE_CODES.filter((code) => wanted.has(code));
}

export function defaultPlanLanguagesForLocale(locale = "en", browserLocale = "") {
  const primary = (value) => typeof value === "string" ? value.toLowerCase().split("-")[0] : "";
  const preferred = [primary(locale), primary(browserLocale)]
    .find((code) => PLAN_LANGUAGE_CODES.includes(code)) || "en";
  return normalizePlanLanguages([preferred]);
}
