// Officially supported plan languages. Shared by React and Worker validation.
export const PLAN_LANGUAGE_CODES = Object.freeze(["uk", "en"]);
export const DEFAULT_PLAN_LANGUAGES = Object.freeze(["uk", "en"]);

// English is mandatory; Ukrainian is optional.
export function normalizePlanLanguages(codes) {
  const wanted = new Set(Array.isArray(codes) ? codes : []);
  wanted.add("en");
  return PLAN_LANGUAGE_CODES.filter((code) => wanted.has(code));
}

export function defaultPlanLanguagesForLocale(locale = "en", browserLocale = "") {
  const primary = (value) => typeof value === "string" ? value.toLowerCase().split("-")[0] : "";
  return normalizePlanLanguages([primary(locale), primary(browserLocale)]);
}
