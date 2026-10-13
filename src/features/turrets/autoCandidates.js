import { getPlannerShift } from "./plannerPlayers.js";
import { allianceKey, getAllianceShiftCounts } from "./allianceRules.js";
import { countAssignedInShift, getShiftCapacity } from "./shiftCapacity.js";
import { PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";
import { getHelperMarch, locateAssignment } from "./turretAssignments.js";
import { comparePlayersByTier } from "./tierPriority.js";

const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

export function autoPlayerId(player) {
  return player?.id === undefined || player?.id === null ? "" : String(player.id);
}

// Captain choice still prioritizes rally capacity; helper choice is tier-first.
// Both ranks stay deterministic regardless of D1 row order.
function rankAutoPlayers(players, purpose) {
  const result = [...(players || [])];
  return result.sort((a, b) => purpose === "captain"
    ? positive(b.rallySize) - positive(a.rallySize) || comparePlayersByTier(a, b)
    : comparePlayersByTier(a, b));
}

function countFlexibleAssigned(assignments, roster, shift) {
  let count = 0;
  for (const slot of Object.values(assignments.shifts[shift])) {
    for (const id of [slot.captainId, ...slot.helperIds]) {
      if (id && getPlannerShift(roster.get(id)) === "flexible") count += 1;
    }
  }
  return count;
}

// Shared per-run cache. Incrementally updated when a captain or helper is placed;
// otherwise thousands of checks would repeatedly traverse every turret.
export function createAutoContext(assignments, players) {
  const roster = new Map((players || []).map((p) => [autoPlayerId(p), p]));
  const alliances = getAllianceShiftCounts(assignments, roster);
  const occupied = new Set();
  const flexible = Object.fromEntries(PLANNER_SHIFTS.map((shift) => [shift, 0]));
  const shiftCounts = Object.fromEntries(PLANNER_SHIFTS.map((shift) => [shift, countAssignedInShift(assignments, shift)]));
  for (const shift of PLANNER_SHIFTS) {
    for (const tower of TURRET_IDS) {
      const slot = assignments.shifts[shift][tower];
      for (const id of [slot.captainId, ...slot.helperIds]) {
        if (!id) continue;
        occupied.add(id);
        if (getPlannerShift(roster.get(id)) === "flexible") flexible[shift]++;
      }
    }
  }
  return { roster, alliances, occupied, flexible, shiftCounts };
}

export function recordAutoPlacement(context, player, shift) {
  const id = autoPlayerId(player);
  context.occupied.add(id);
  context.shiftCounts[shift] += 1;
  const key = allianceKey(player);
  const counts = context.alliances[shift].counts;
  counts.set(key, (counts.get(key) || 0) + 1);
  if (getPlannerShift(player) === "flexible") context.flexible[shift]++;
}

// Stage 3 stores explicit numbers of flexible players per shift; these are
// quotas only when manual limits are enabled, never a change to registration.
function flexibleAllowed(player, shift, settings, assignments, roster, context) {
  if (getPlannerShift(player) !== "flexible") return true;
  if (!settings.allowFlexible) return false;
  if (!settings.allianceLimits) return true;
  const maximum = Math.max(0, Number(settings[`${shift}Extra`]) || 0);
  return (context ? context.flexible[shift] : countFlexibleAssigned(assignments, roster, shift)) < maximum;
}

export function eligibleAutoPlayers({ players, assignments, settings, shift, captain = null, purpose, context = null }) {
  const roster = context?.roster || new Map((players || []).map((row) => [autoPlayerId(row), row]));
  return rankAutoPlayers((players || []).filter((p) => canAutoUsePlayer({
    player: p, assignments, settings, shift, captain, purpose, roster, context,
  })), purpose);
}

export function canAutoUsePlayer({ player, assignments, settings, shift, captain = null, purpose, roster, context = null }) {
  const id = autoPlayerId(player);
  if (!id || (context ? context.occupied.has(id) : locateAssignment(assignments, id))) return false;
  if (settings.respectShift) {
    const available = getPlannerShift(player);
    if (available !== shift && !(available === "flexible" && settings.allowFlexible)) return false;
  }
  if (!flexibleAllowed(player, shift, settings, assignments, roster, context)) return false;
  // All source alliances compete for the same 100 (or smaller custom) seats.
  const used = context ? context.shiftCounts[shift] : countAssignedInShift(assignments, shift);
  if (used >= getShiftCapacity(settings, shift)) return false;
  if (purpose === "captain") {
    return (!settings.onlyCaptains || player.captain === true) && positive(player.rallySize) > 0;
  }
  return getHelperMarch(player, settings) > 0 &&
    (!settings.sameTroopType || !captain || player.troopType === captain.troopType);
}

