import { TIER_DEFAULTS } from "./plannerConstants.js";
import { normalizePlannerShiftOverrides } from "./plannerShiftOverrides.js";
import { DEFAULT_PLAN_LANGUAGES, normalizePlanLanguages } from "./planLanguages.js";

// Local-only configuration draft: NOT a published plan.
export const DEFAULT_PLANNER_SETTINGS = Object.freeze({
  mode: "balanced", onlyCaptains: true, respectShift: true,
  sameTroopType: true, allowFlexible: false, allianceLimits: false,
  maxHelpers: 29,
  shift1Limit: 100, shift2Limit: 100, shift3Limit: 100, shift4Limit: 100,
  shift1Extra: 0, shift2Extra: 0, shift3Extra: 0, shift4Extra: 0,
  tierLimitsEnabled: false, tierLimits: TIER_DEFAULTS, shiftOverrides: Object.freeze({}),
  planLanguages: DEFAULT_PLAN_LANGUAGES,
});
const MODES = new Set(["balanced", "maxMarch", "manual"]);
const BOOLEANS = [
  "onlyCaptains", "respectShift", "sameTroopType", "allowFlexible",
  "allianceLimits", "tierLimitsEnabled",
];
function integerInRange(value, fallback, min, max) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(min, Math.min(max, Math.trunc(number))) : fallback;
}
export function normalizePlannerSettings(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const result = { ...DEFAULT_PLANNER_SETTINGS, tierLimits: { ...TIER_DEFAULTS } };
  result.shiftOverrides = normalizePlannerShiftOverrides(source.shiftOverrides);
  result.planLanguages = normalizePlanLanguages(source.planLanguages ?? DEFAULT_PLAN_LANGUAGES);
  result.mode = MODES.has(source.mode) ? source.mode : result.mode;
  result.maxHelpers = integerInRange(source.maxHelpers, result.maxHelpers, 0, 29);
  for (const key of BOOLEANS) {
    if (typeof source[key] === "boolean") result[key] = source[key];
  }
  for (const key of ["shift1Limit", "shift2Limit", "shift3Limit", "shift4Limit"]) {
    result[key] = integerInRange(source[key], result[key], 0, 100);
  }
  for (const key of ["shift1Extra", "shift2Extra", "shift3Extra", "shift4Extra"]) {
    result[key] = integerInRange(source[key], result[key], 0, 100000);
  }
  const limits = source.tierLimits && typeof source.tierLimits === "object"
    ? source.tierLimits : {};
  for (const [tier, fallback] of Object.entries(TIER_DEFAULTS)) {
    result.tierLimits[tier] = integerInRange(limits[tier], fallback, 0, 10000000);
  }
  return result;
}
export function updatePlannerSettings(settings, field, value) {
  if (Object.hasOwn(TIER_DEFAULTS, field)) {
    return normalizePlannerSettings({ ...settings, tierLimits: { ...settings.tierLimits, [field]: value } });
  }
  return normalizePlannerSettings({ ...settings, [field]: value });
}
