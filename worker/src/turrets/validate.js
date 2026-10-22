import { normalizePlanLanguages } from "../../../src/features/turrets/planLanguages.js";
import { MAX_HELPERS_PER_TURRET, PLANNER_SHIFTS, TURRET_IDS } from "../../../src/features/turrets/plannerConstants.js";
import { normalizePlannerSettings } from "../../../src/features/turrets/plannerSettings.js";
import { availableForShift, captainAvailableForShift, createEmptyAssignments, getHelperMarch } from "../../../src/features/turrets/turretAssignments.js";
import { getPlannerShift } from "../../../src/features/turrets/plannerPlayers.js";
import { getShiftCapacity } from "../../../src/features/turrets/shiftCapacity.js";
import { comparePlayersByTier } from "../../../src/features/turrets/tierPriority.js";
import { composePlanPlayers, MANUAL_ID_PATTERN, validPlanPlayerFields } from "../../../src/features/turrets/turretPlanPlayers.js";
import { effectiveTowerSettings, getTowerMaxHelpers, validTowerRules } from "../../../src/features/turrets/turretSlotRules.js";
import {
  applyPlannerShiftOverrides, invalidPlannerShiftOverrideIds,
} from "../../../src/features/turrets/plannerShiftOverrides.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const finiteId = (value) => typeof value === "string" &&
  ((/^\d+$/.test(value) && value.length <= 18) || MANUAL_ID_PATTERN.test(value));
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

export class PlanError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}

/** Strict, non-destructive checks: never silently discard a player when saving or publishing. */
export function validateTurretDraft(settingsInput, input, players) {
  if (!isObject(settingsInput) || !isObject(input) || input.version !== 1 || !isObject(input.shifts)) {
    throw new PlanError("INVALID_TURRET_DRAFT");
  }
  if (settingsInput.maxHelpers !== undefined &&
    (!Number.isSafeInteger(settingsInput.maxHelpers) || settingsInput.maxHelpers < 0 ||
      settingsInput.maxHelpers > MAX_HELPERS_PER_TURRET)) {
    throw new PlanError("INVALID_TURRET_DRAFT");
  }
  const settings = normalizePlannerSettings(settingsInput);
  if (!validTowerRules(input.towerRules)) throw new PlanError("INVALID_TURRET_DRAFT");
  const manualPlayers = input.manualPlayers || {};
  const playerOverrides = input.playerOverrides || {};
  if (!isObject(manualPlayers) || Object.keys(manualPlayers).length > 250 ||
    !isObject(playerOverrides) || Object.keys(playerOverrides).length > 2000) {
    throw new PlanError("INVALID_TURRET_DRAFT");
  }
  const registrationIds = new Set(players.map((player) => String(player.id)));
  for (const [id, player] of Object.entries(manualPlayers)) {
    if (!MANUAL_ID_PATTERN.test(id) || registrationIds.has(id) || !isObject(player) ||
      !PLANNER_SHIFTS.includes(player.shift) ||
      Object.keys(player).length !== 8 ||
      !validPlanPlayerFields(Object.fromEntries(Object.entries(player).filter(([key]) => key !== "shift")))) {
      throw new PlanError("INVALID_TURRET_DRAFT");
    }
  }
  for (const [id, fields] of Object.entries(playerOverrides)) {
    if (!registrationIds.has(id) || !validPlanPlayerFields(fields)) {
      throw new PlanError("INVALID_TURRET_DRAFT");
    }
  }
  if (settingsInput.shiftOverrides !== undefined &&
    (!isObject(settingsInput.shiftOverrides) ||
      Object.keys(settingsInput.shiftOverrides).length !== Object.keys(settings.shiftOverrides).length ||
      invalidPlannerShiftOverrideIds(settings.shiftOverrides, players).length)) {
    throw new PlanError("INVALID_TURRET_SHIFT_OVERRIDE");
  }
  const planPlayers = composePlanPlayers(
    applyPlannerShiftOverrides(players, settings.shiftOverrides), input);
  const roster = new Map(planPlayers.map((player) => [String(player.id), player]));
  if (settings.allianceLimits && PLANNER_SHIFTS.reduce((sum, shift) => sum + Number(settings[`${shift}Extra`] || 0), 0) >
    players.filter((player) => getPlannerShift(player) === "flexible").length) {
    throw new PlanError("TURRET_FLEXIBLE_LIMIT_EXCEEDED");
  }
  const seen = new Set();
  const assignedRoles = new Map();
  const assignedPerShift = Object.fromEntries(PLANNER_SHIFTS.map((shift) => [shift, 0]));
  const assignments = createEmptyAssignments();
  const requestedShifts = Object.keys(input.shifts);
  // Old saved drafts may contain only shifts 1/2. Missing 3/4 mean empty turrets.
  if (!requestedShifts.includes("shift1") || !requestedShifts.includes("shift2") ||
    !requestedShifts.every((s) => PLANNER_SHIFTS.includes(s))) {
    throw new PlanError("INVALID_TURRET_DRAFT");
  }

  for (const shift of PLANNER_SHIFTS) {
    const inThisShift = new Set();
    const towers = input.shifts[shift] || createEmptyAssignments().shifts[shift];
    if (!isObject(towers) || Object.keys(towers).length !== TURRET_IDS.length ||
      !Object.keys(towers).every((tower) => TURRET_IDS.includes(tower))) {
      throw new PlanError("INVALID_TURRET_DRAFT");
    }
    for (const tower of TURRET_IDS) {
      const slot = towers[tower];
      if (!isObject(slot) || !Array.isArray(slot.helperIds) || !isObject(slot.helperMarches) ||
        Object.keys(slot).length !== 3 ||
        !["captainId", "helperIds", "helperMarches"].every((key) => Object.hasOwn(slot, key))) {
        throw new PlanError("INVALID_TURRET_DRAFT");
      }
      const towerSettings = effectiveTowerSettings(settings, input, shift, tower);
      const captainId = slot.captainId;
      if (captainId !== null && !finiteId(captainId)) throw new PlanError("INVALID_TURRET_DRAFT");
      if (slot.helperIds.length > MAX_HELPERS_PER_TURRET ||
        slot.helperIds.length > getTowerMaxHelpers(input, shift, tower, settings) ||
        (!captainId && slot.helperIds.length)) {
        throw new PlanError("TURRET_CAPACITY_EXCEEDED");
      }
      const captain = captainId ? roster.get(captainId) : null;
      if (captainId && (!captain || inThisShift.has(captainId) ||
        (assignedRoles.has(captainId) && assignedRoles.get(captainId) !== "captain") ||
        (towerSettings.onlyCaptains && captain.captain !== true) ||
        !(captainAvailableForShift(captain, shift, towerSettings) ||
          assignedRoles.get(captainId) === "captain"))) {
        throw new PlanError("INVALID_TURRET_CAPTAIN");
      }
      if (captainId) {
        seen.add(captainId);
        inThisShift.add(captainId);
        assignedRoles.set(captainId, "captain");
        assignedPerShift[shift] += 1;
        if (assignedPerShift[shift] > getShiftCapacity(settings, shift)) {
          throw new PlanError("TURRET_SHIFT_CAPACITY_EXCEEDED");
        }
      }
      let totalHelperMarch = 0;
      const helperMarches = {};
      for (const id of slot.helperIds) {
        const player = roster.get(id);
        const march = slot.helperMarches[id];
        if (!finiteId(id) || !player || inThisShift.has(id) || !captain ||
          (assignedRoles.has(id) && assignedRoles.get(id) !== "helper") ||
          !(availableForShift(player, shift, towerSettings) ||
            assignedRoles.get(id) === "helper") ||
          (towerSettings.sameTroopType && player.troopType !== captain.troopType) ||
          !positiveInteger(march) || march > getHelperMarch(player, settings)) {
          throw new PlanError("INVALID_TURRET_HELPER");
        }
        seen.add(id);
        inThisShift.add(id);
        assignedRoles.set(id, "helper");
        assignedPerShift[shift] += 1;
        if (assignedPerShift[shift] > getShiftCapacity(settings, shift)) {
          throw new PlanError("TURRET_SHIFT_CAPACITY_EXCEEDED");
        }
        helperMarches[id] = march;
        totalHelperMarch += march;
      }
      if (Object.keys(slot.helperMarches).length !== slot.helperIds.length ||
        Object.keys(slot.helperMarches).some((id) => !slot.helperIds.includes(id))) {
        throw new PlanError("INVALID_TURRET_HELPER");
      }
      if (captain && totalHelperMarch > Number(captain.rallySize)) {
        throw new PlanError("TURRET_CAPACITY_EXCEEDED");
      }
      assignments.shifts[shift][tower] = { captainId, helperIds: [...slot.helperIds], helperMarches };
    }
  }
  for (const key of ["manualPlayers", "playerOverrides", "towerRules"]) {
    if (Object.hasOwn(input, key)) assignments[key] = structuredClone(input[key]);
  }
  return { settings, assignments, count: seen.size };
}

const toPublicPlayer = (player, id, marchOverride) => player ? ({
  id,
  nickname: String(player.nickname || "").slice(0, 90),
  alliance: String(player.alliance || "").slice(0, 80),
  tier: String(player.tier || "").slice(0, 12),
  troopType: String(player.troopType || ""),
  marchSize: marchOverride ?? Math.max(0, Number(player.marchSize) || 0),
}) : null;

/** Only whitelisted, display-only fields may enter the public plan snapshot. */
export function createPublicPlan(assignments, players, visibleShifts = ["shift1", "shift2"], languages = ["uk", "en"]) {
  const allPlayers = composePlanPlayers(players, assignments);
  const roster = new Map(allPlayers.map((p) => [String(p.id), p]));
  return { __languages: normalizePlanLanguages(languages), ...Object.fromEntries(visibleShifts.filter((shift) => PLANNER_SHIFTS.includes(shift)).map((shift) => [shift,
    Object.fromEntries(TURRET_IDS.map((tower) => {
      const slot = assignments.shifts[shift][tower];
      const captain = slot.captainId ? roster.get(slot.captainId) : null;
      return [tower, {
        troopType: captain?.troopType || null,
        captain: captain ? {
          ...toPublicPlayer(captain, `${shift}-${tower}-captain`),
          // Safe public number required for rally capacity labels; never include
          // comments, contact details, or other private registration fields.
          rallySize: Math.max(0, Number(captain.rallySize) || 0),
        } : null,
        players: [...slot.helperIds].sort((a, b) =>
          comparePlayersByTier(roster.get(a), roster.get(b),
            (player) => slot.helperMarches[String(player?.id)] || 0))
          .map((id, index) =>
            toPublicPlayer(roster.get(id), `${shift}-${tower}-${index}`, slot.helperMarches[id])),
      }];
    }))
  ])) };
}
