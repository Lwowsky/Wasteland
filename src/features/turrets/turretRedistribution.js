import { PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";

/**
 * Return a new plan with every helper returned to reserve. Captains, their
 * turrets and other slot settings remain unchanged. This is a local edit;
 * callers decide whether or when to synchronize with D1.
 */
export function releaseAllTurretHelpers(assignments, activeShifts = PLANNER_SHIFTS) {
  if (!assignments?.shifts) return { error: "invalid" };
  const next = structuredClone(assignments);
  let released = 0;
  for (const shift of activeShifts) {
    for (const tower of TURRET_IDS) {
      const slot = next.shifts?.[shift]?.[tower];
      if (!slot) return { error: "invalid" };
      released += Array.isArray(slot.helperIds) ? slot.helperIds.length : 0;
      slot.helperIds = [];
      slot.helperMarches = {};
    }
  }
  return { assignments: next, released };
}

function helperLocations(assignments) {
  const locations = new Map();
  for (const shift of PLANNER_SHIFTS) {
    for (const tower of TURRET_IDS) {
      for (const id of assignments?.shifts?.[shift]?.[tower]?.helperIds || []) {
        locations.set(String(id), `${shift}:${tower}`);
      }
    }
  }
  return locations;
}

/** Identify actual player movement, not just how many slots were refilled.
 * A deterministic redistribution can legitimately pick the same helpers.
 */
export function compareRedistributedHelpers(before, after) {
  const previous = helperLocations(before);
  const current = helperLocations(after);
  let helpersMoved = 0;
  let helpersSameTurret = 0;
  let helpersNewFromReserve = 0;
  for (const [id, target] of current) {
    if (!previous.has(id)) helpersNewFromReserve++;
    else if (previous.get(id) === target) helpersSameTurret++;
    else helpersMoved++;
  }
  const helpersToReserve = [...previous.keys()].filter((id) => !current.has(id)).length;
  return { helpersMoved, helpersSameTurret, helpersNewFromReserve, helpersToReserve };
}
