import uk from "../../../i18n/locales/uk/content/finalPlan.json" with { type: "json" };
import en from "../../../i18n/locales/en/content/finalPlan.json" with { type: "json" };
import ru from "../../../i18n/locales/ru/content/finalPlan.json" with { type: "json" };
import pl from "../../../i18n/locales/pl/content/finalPlan.json" with { type: "json" };
import de from "../../../i18n/locales/de/content/finalPlan.json" with { type: "json" };
import ja from "../../../i18n/locales/ja/content/finalPlan.json" with { type: "json" };
import zh from "../../../i18n/locales/zh/content/finalPlan.json" with { type: "json" };
import ko from "../../../i18n/locales/ko/content/finalPlan.json" with { type: "json" };
import vi from "../../../i18n/locales/vi/content/finalPlan.json" with { type: "json" };
import ar from "../../../i18n/locales/ar/content/finalPlan.json" with { type: "json" };
import {
  DEFAULT_PLAN_LANGUAGES, defaultPlanLanguagesForLocale, normalizePlanLanguages,
} from "../../../features/turrets/planLanguages.js";

export { DEFAULT_PLAN_LANGUAGES, defaultPlanLanguagesForLocale, normalizePlanLanguages };

// One UI and the same dictionaries power public/admin boards and PNG/TXT.
export const PLAN_LANGUAGE_CHOICES = [
  { code: "uk" }, { code: "en", fixed: true },
  { code: "ru" }, { code: "pl" }, { code: "de" }, { code: "ja" },
  { code: "zh" }, { code: "ko" }, { code: "vi" }, { code: "ar" },
];
const DICTIONARIES = { uk, en, ru, pl, de, ja, zh, ko, vi, ar };
export const PLAN_LANGUAGE_STORAGE_KEY = "wasteland:final-plan-languages:v2";

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
      typeByCaptain: common((dictionary) => dictionary.typeByCaptain),
      noPlayers: common((dictionary) => dictionary.noPlayers),
      textExport: { ...pageDictionary.textExport, ...localized.textExport },
      labels: { captain: common((dictionary) => dictionary.labels.captain),
        players: common((dictionary) => dictionary.labels.players) },
      metrics: { ...localized.metrics,
        legend: common((dictionary) => dictionary.metrics.legend),
        unavailable: common((dictionary) => dictionary.metrics.unavailable),
        capacity: common((dictionary) => dictionary.metrics.capacity),
        used: common((dictionary) => dictionary.metrics.used),
        remaining: common((dictionary) => dictionary.metrics.remaining) },
    },
  };
}
