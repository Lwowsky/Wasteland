import { PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";

// All registrations are for ONE shared Wasteland alliance. Original alliance tags
// describe where players come from; they do not grant separate 100-seat pools.
export const MAX_WASTELAND_SHIFT_PLAYERS = 100;

// The original `allianceLimits` and `shiftNLimit` keys are kept for compatibility
// with existing local/D1 drafts. Their meaning is now a total shift capacity.
export function getShiftCapacity(settings, shift) {
  if (!PLANNER_SHIFTS.includes(shift)) return 0;
  if (!settings?.allianceLimits) return MAX_WASTELAND_SHIFT_PLAYERS;
  const raw = Number(settings[`${shift}Limit`]);
  if (!Number.isFinite(raw)) return MAX_WASTELAND_SHIFT_PLAYERS;
  return Math.max(0, Math.min(MAX_WASTELAND_SHIFT_PLAYERS, Math.trunc(raw)));
}

export function countAssignedInShift(assignments, shift) {
  if (!PLANNER_SHIFTS.includes(shift)) return 0;
  return TURRET_IDS.reduce((total, tower) => {
    const slot = assignments?.shifts?.[shift]?.[tower];
    return total + (slot?.captainId ? 1 : 0) + (slot?.helperIds?.length || 0);
  }, 0);
}

export function getShiftCapacityStatus(assignments, settings, shift) {
  const capacity = getShiftCapacity(settings, shift);
  const assigned = countAssignedInShift(assignments, shift);
  return { shift, capacity, assigned, remaining: Math.max(0, capacity - assigned),
    exceeded: Math.max(0, assigned - capacity) };
}
