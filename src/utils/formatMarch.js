import { getIntlLocale } from "./intlLocale.js";

// Shared formatting for troop marches in admin and published plans.
// Keep "—" for missing or invalid values, while preserving numeric zero.
export function formatMarch(value, language = "en") {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat(getIntlLocale(language)).format(number);
}
