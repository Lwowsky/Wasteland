import { PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";
import { addHelper, changeCaptain, locateAssignment, removeAssignedPlayer } from "./turretAssignments.js";
import { composePlanPlayers, createManualPlanPlayer, MANUAL_ID_PATTERN,
  normalizePlanPlayerFields, validPlanPlayerFields } from "./turretPlanPlayers.js";
import { effectiveTowerSettings } from "./turretSlotRules.js";

/** Create a player only in the working tower plan; never send it to registration API. */
export function addManualTurretPlayer(assignments, registrations, settings, { id, shift, tower, role, fields }) {
  if (!PLANNER_SHIFTS.includes(shift) || !TURRET_IDS.includes(tower) ||
    !["captain", "helper"].includes(role) || !MANUAL_ID_PATTERN.test(id) ||
    (registrations || []).some((row) => String(row.id) === id) || assignments.manualPlayers?.[id]) {
    return { error: "invalid" };
  }
  const player = createManualPlanPlayer({ ...fields, captain: role === "captain" }, shift, id);
  if (!player) return { error: "invalidFields" };
  const candidate = structuredClone(assignments);
  candidate.manualPlayers = { ...candidate.manualPlayers, [id]: player };
  const roster = composePlanPlayers(registrations, candidate);
  const rules = effectiveTowerSettings(settings, candidate, shift, tower);
  const outcome = role === "captain"
    ? changeCaptain(candidate, shift, tower, id, roster, rules)
    : addHelper(candidate, shift, tower, id, roster, rules);
  return outcome.error ? { error: outcome.error } : { assignments: outcome.assignments };
}

/** Edit an assigned manual or registered player, only inside the plan.
 * Current placement and other turrets are unchanged; unsafe edits are rejected.
 */
export function editTurretPlanPlayer(assignments, registrations, settings, id, values) {
  const source = composePlanPlayers(registrations, assignments).find((row) => String(row.id) === String(id));
  const location = locateAssignment(assignments, id);
  if (!source || !location) return { error: "unavailable" };
  const fields = normalizePlanPlayerFields({ ...source, ...values });
  if (!validPlanPlayerFields(fields)) return { error: "invalidFields" };
  const next = structuredClone(assignments);
  const manual = MANUAL_ID_PATTERN.test(String(id));
  if (manual) {
    next.manualPlayers = { ...next.manualPlayers,
      [id]: { ...fields, shift: source.shift } };
  } else {
    next.playerOverrides = { ...next.playerOverrides, [id]: {
      ...fields, ...(assignments.playerOverrides?.[id]?.shift ? { shift: source.shift } : {}),
    } };
  }
  const roster = composePlanPlayers(registrations, next);
  const captain = roster.find((row) => String(row.id) === String(next.shifts[location.shift][location.tower].captainId));
  const rule = effectiveTowerSettings(settings, next, location.shift, location.tower);
  const slot = next.shifts[location.shift][location.tower];
  if (location.role === "captain") {
    if (rule.onlyCaptains && !fields.captain) return { error: "unavailable" };
    if (rule.sameTroopType && slot.helperIds.some((helperId) =>
      roster.find((row) => String(row.id) === helperId)?.troopType !== fields.troopType)) return { error: "unavailable" };
    if (Object.values(slot.helperMarches).reduce((sum, march) => sum + march, 0) > fields.rallySize) {
      return { error: "noRoom" };
    }
  } else {
    if (rule.sameTroopType && captain?.troopType !== fields.troopType) return { error: "unavailable" };
    const currentMarch = slot.helperMarches[id];
    if (currentMarch > fields.marchSize) slot.helperMarches[id] = fields.marchSize;
    if (slot.helperMarches[id] <= 0) return { error: "invalidFields" };
  }
  return { assignments: next };
}

export function removeTurretPlanPlayer(assignments, id) {
  const result = removeAssignedPlayer(assignments, String(id));
  if (result.error) return result;
  const next = result.assignments;
  if (MANUAL_ID_PATTERN.test(String(id))) {
    const copy = structuredClone(next);
    if (copy.manualPlayers) delete copy.manualPlayers[id];
    return { assignments: copy };
  }
  return result;
}

/** Move a player inside the plan without touching the registration database.
 * Captains with helpers cannot move until their helpers are released.
 */
export function moveTurretPlanPlayer(assignments, players, settings, id, values, destination) {
  const location = locateAssignment(assignments, id);
  if (!location || !PLANNER_SHIFTS.includes(destination?.shift) ||
    !TURRET_IDS.includes(destination?.tower) || !["captain", "helper"].includes(destination?.role)) {
    return { error: "invalid" };
  }
  const samePlace = destination.shift === location.shift && destination.tower === location.tower &&
    destination.role === location.role;
  if (samePlace) return editTurretPlanPlayer(assignments, players, settings, id, values);
  const roster = composePlanPlayers(players, assignments);
  const original = roster.find((p) => String(p.id) === String(id));
  if (!original) return { error: "unavailable" };
  const fields = normalizePlanPlayerFields({ ...original, ...values });
  const updated = { ...fields, shift: destination.shift };
  if (!validPlanPlayerFields(updated)) return { error: "invalidFields" };
  const released = removeAssignedPlayer(assignments, String(id));
  if (released.error) return released;
  const next = structuredClone(released.assignments);
  if (MANUAL_ID_PATTERN.test(String(id))) {
    next.manualPlayers = { ...next.manualPlayers, [id]: updated };
  } else {
    next.playerOverrides = { ...next.playerOverrides, [id]: updated };
  }
  const destinationPlayers = composePlanPlayers(players, next);
  const towerSettings = effectiveTowerSettings(settings, next, destination.shift, destination.tower);
  return destination.role === "captain"
    ? changeCaptain(next, destination.shift, destination.tower, String(id), destinationPlayers, towerSettings)
    : addHelper(next, destination.shift, destination.tower, String(id), destinationPlayers, towerSettings);
}
