import { getPlannerShift } from "./plannerPlayers.js";
import { PLANNER_SHIFTS } from "./plannerConstants.js";
import { locateAssignment } from "./turretAssignments.js";

const VALID_ID = /^\d{1,18}$/;
const TARGET_SHIFTS = new Set(PLANNER_SHIFTS);

// A shift override is part of a turret *draft*. It never modifies registrations.
// Only players originally registered for Any shift can be reassigned.
export function normalizePlannerShiftOverrides(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([id, shift]) =>
    VALID_ID.test(id) && TARGET_SHIFTS.has(shift)).slice(0, 10000));
}

export function applyPlannerShiftOverrides(players, shiftOverrides) {
  const overrides = normalizePlannerShiftOverrides(shiftOverrides);
  return (players || []).map((player) => {
    const override = overrides[String(player.id)];
    if (!override || getPlannerShift(player) !== "flexible") return player;
    return { ...player, shift: override };
  });
}

export function invalidPlannerShiftOverrideIds(shiftOverrides, players) {
  const roster = new Map((players || []).map((player) => [String(player.id), player]));
  return Object.entries(shiftOverrides || {}).filter(([id, shift]) =>
    !VALID_ID.test(id) || !TARGET_SHIFTS.has(shift) ||
    !roster.has(id) || getPlannerShift(roster.get(id)) !== "flexible"
  ).map(([id]) => id);
}

function candidateOrder(a, b) {
  return (Number(b.marchSize) || 0) - (Number(a.marchSize) || 0) ||
    (Number(b.rallySize) || 0) - (Number(a.rallySize) || 0) ||
    String(a.nickname || "").localeCompare(String(b.nickname || ""), "uk") ||
    String(a.id).localeCompare(String(b.id), "en");
}

export function getAvailableFlexiblePlayers(players, settings, assignments) {
  const shifted = settings?.shiftOverrides || {};
  return (players || []).filter((player) => getPlannerShift(player) === "flexible" &&
    !shifted[String(player.id)] && !locateAssignment(assignments, String(player.id)))
    .sort(candidateOrder);
}

// Atomic: either all requested players are reassigned in the *draft*, or none.
// Existing manual turret placements are never removed by this operation.
export function addPlannerFlexibleShifts(players, settings, assignments, ...requestedCounts) {
  // Older callers pass two counts; four-shift plans pass one count per shift.
  const counts = PLANNER_SHIFTS.map((_, index) => Number(requestedCounts[index] ?? 0));
  if (!counts.every((count) => Number.isSafeInteger(count) && count >= 0)) {
    return { error: "invalidCount" };
  }
  const available = getAvailableFlexiblePlayers(players, settings, assignments);
  if (counts.reduce((sum, count) => sum + count, 0) > available.length) {
    return { error: "notEnoughFlexible" };
  }
  const overrides = { ...normalizePlannerShiftOverrides(settings.shiftOverrides) };
  let cursor = 0;
  PLANNER_SHIFTS.forEach((shift, index) => {
    available.slice(cursor, cursor + counts[index]).forEach((player) => {
      overrides[String(player.id)] = shift;
    });
    cursor += counts[index];
  });
  return {
    shiftOverrides: overrides,
    added1: counts[0], added2: counts[1], added3: counts[2], added4: counts[3],
  };
}

// Restore only unassigned Any-shift players to their original availability.
// Any player occupying a turret (captain OR helper) keeps the plan-only override,
// so that no automatic action can move or invalidate an existing placement.
export function restorePlannerFlexibleShifts(settings, assignments) {
  const overrides = normalizePlannerShiftOverrides(settings?.shiftOverrides);
  const assigned = new Set();
  for (const shift of PLANNER_SHIFTS) {
    for (const slot of Object.values(assignments?.shifts?.[shift] || {})) {
      if (slot?.captainId != null) assigned.add(String(slot.captainId));
      for (const id of slot?.helperIds || []) assigned.add(String(id));
    }
  }
  const remaining = Object.fromEntries(Object.entries(overrides).filter(([id]) => assigned.has(id)));
  return {
    shiftOverrides: remaining,
    restored: Object.keys(overrides).length - Object.keys(remaining).length,
    kept: Object.keys(remaining).length,
  };
}
