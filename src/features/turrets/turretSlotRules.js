import { MAX_HELPERS_PER_TURRET, PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";

export const TOWER_FLAGS = Object.freeze(["onlyCaptains", "respectShift", "sameTroopType", "allowFlexible"]);
const LIMIT_TIERS = Array.from({ length: 14 }, (_, index) => `T${index + 1}`);

export function getTowerRule(assignments, shift, tower) {
  return assignments?.towerRules?.[shift]?.[tower] || {};
}

// A turret-level choice takes precedence over the global default.
// Older drafts have no global field and therefore retain the 29-seat default.
export function getTowerMaxHelpers(assignments, shift, tower, settings = null) {
  const requested = getTowerRule(assignments, shift, tower).maxHelpers;
  if (Number.isSafeInteger(requested) && requested >= 0 && requested <= MAX_HELPERS_PER_TURRET) return requested;
  const globalLimit = settings?.maxHelpers;
  return Number.isSafeInteger(globalLimit) && globalLimit >= 0 && globalLimit <= MAX_HELPERS_PER_TURRET
    ? globalLimit : MAX_HELPERS_PER_TURRET;
}

export function effectiveTowerSettings(settings, assignments, shift, tower) {
  const rule = getTowerRule(assignments, shift, tower);
  const flags = rule.flags || {};
  return { ...settings, ...Object.fromEntries(TOWER_FLAGS.filter((key) => typeof flags[key] === "boolean")
    .map((key) => [key, flags[key]])) };
}

export function updateTowerRule(assignments, shift, tower, patch) {
  if (!PLANNER_SHIFTS.includes(shift) || !TURRET_IDS.includes(tower)) return { error: "invalid" };
  if (patch.maxHelpers !== undefined && patch.maxHelpers !== null &&
    (!Number.isSafeInteger(Number(patch.maxHelpers)) || Number(patch.maxHelpers) < 0 ||
      Number(patch.maxHelpers) > MAX_HELPERS_PER_TURRET)) return { error: "invalidFields" };
  if (patch.flags && Object.entries(patch.flags).some(([key, value]) =>
    !TOWER_FLAGS.includes(key) || typeof value !== "boolean")) return { error: "invalidFields" };
  if (patch.tierLimits && Object.entries(patch.tierLimits).some(([tier, value]) =>
    !LIMIT_TIERS.includes(tier) || !Number.isSafeInteger(Number(value)) ||
    Number(value) < 0 || Number(value) > 10000000)) return { error: "invalidFields" };
  const next = structuredClone(assignments);
  const current = getTowerRule(next, shift, tower);
  const flags = patch.flags ? { ...current.flags, ...patch.flags } : current.flags || {};
  const tierLimits = patch.tierLimits ? { ...current.tierLimits, ...Object.fromEntries(
    Object.entries(patch.tierLimits).map(([tier, value]) => [tier, Number(value)])) } : current.tierLimits || {};
  next.towerRules = {
    ...next.towerRules,
    [shift]: { ...(next.towerRules?.[shift] || {}), [tower]: {
      flags, tierLimits,
      ...(patch.maxHelpers === null ? {} : patch.maxHelpers !== undefined
        ? { maxHelpers: Number(patch.maxHelpers) }
        : current.maxHelpers !== undefined ? { maxHelpers: current.maxHelpers } : {}),
    } },
  };
  return { assignments: next };
}

export function validTowerRules(rules) {
  if (rules === undefined) return true;
  if (!rules || typeof rules !== "object" || Array.isArray(rules) ||
    Object.keys(rules).some((shift) => !PLANNER_SHIFTS.includes(shift))) return false;
  return Object.entries(rules).every(([, towers]) => towers && typeof towers === "object" &&
    !Array.isArray(towers) && Object.entries(towers).every(([tower, rule]) =>
      TURRET_IDS.includes(tower) && rule && typeof rule === "object" && !Array.isArray(rule) &&
      Object.keys(rule).every((key) => ["flags", "tierLimits", "maxHelpers"].includes(key)) &&
      (rule.maxHelpers === undefined || (Number.isSafeInteger(rule.maxHelpers) &&
        rule.maxHelpers >= 0 && rule.maxHelpers <= MAX_HELPERS_PER_TURRET)) &&
      (rule.flags === undefined || (rule.flags !== null && typeof rule.flags === "object" && !Array.isArray(rule.flags) &&
        Object.entries(rule.flags).every(([key, value]) => TOWER_FLAGS.includes(key) && typeof value === "boolean"))) &&
      (rule.tierLimits === undefined || (rule.tierLimits !== null && typeof rule.tierLimits === "object" && !Array.isArray(rule.tierLimits) &&
        Object.entries(rule.tierLimits).every(([tier, limit]) => LIMIT_TIERS.includes(tier) &&
        Number.isSafeInteger(limit) && limit >= 0 && limit <= 10000000)))));
}
