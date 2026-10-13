import uk from "../../../i18n/locales/uk/content/finalPlan.json" with { type: "json" };
import en from "../../../i18n/locales/en/content/finalPlan.json" with { type: "json" };
import {
  DEFAULT_PLAN_LANGUAGES, defaultPlanLanguagesForLocale, normalizePlanLanguages,
} from "../../../features/turrets/planLanguages.js";

export { DEFAULT_PLAN_LANGUAGES, defaultPlanLanguagesForLocale, normalizePlanLanguages };

// Only the two official website languages are available for plan exports.
export const PLAN_LANGUAGE_CHOICES = [
  { code: "uk" },
  { code: "en", fixed: true },
];
const DICTIONARIES = { uk, en };
export const PLAN_LANGUAGE_STORAGE_KEY = "wasteland:final-plan-languages:v1";

export function planLanguageLabels(codes, selector) {
  return normalizePlanLanguages(codes).map((code) => selector(DICTIONARIES[code], code))
    .filter(Boolean).join(" ✦ ");
}

// Shift numbers are the only headings: no half-of-event subtitles in any language.
// Shared by the admin board, public board, TXT export and PNG export.
export function getPlanShiftHeading(shift, codes) {
  return planLanguageLabels(codes, (dictionary) => dictionary[shift]);
}

export function getPlanBoardTranslations(t, codes, locale = "uk") {
  const common = (selector) => planLanguageLabels(codes, selector);
  const localized = t?.finalPlan || {};
  const pageDictionary = DICTIONARIES[locale] || DICTIONARIES.en;
  return {
    ...t,
    finalPlan: {
      ...localized,
      towers: Object.fromEntries(["hub", "north", "west", "east", "south"].map(
        (id) => [id, common((dictionary) => dictionary.towers?.[id])])),
      troops: Object.fromEntries(["fighter", "shooter", "rider"].map(
        (id) => [id, common((dictionary) => dictionary.troops?.[id])])),
      textExport: { ...pageDictionary.textExport, ...localized.textExport },
      labels: { captain: common((dictionary) => dictionary.labels.captain),
        players: common((dictionary) => dictionary.labels.players) },
      metrics: { ...localized.metrics,
        capacity: common((dictionary) => dictionary.metrics.capacity),
        used: common((dictionary) => dictionary.metrics.used),
        remaining: common((dictionary) => dictionary.metrics.remaining) },
    },
  };
}
