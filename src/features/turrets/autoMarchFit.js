/** Capacity-aware helper placement inspired by the old tower planner.
 * First reserve small positive marches (1,000 by default), then let the
 * allocation stage grow them within the captain's rally and tier caps.
 * Existing helper seats are never removed or moved between turrets. */
import { eligibleAutoPlayers } from "./autoCandidates.js";
import { effectiveTowerSettings, getTowerMaxHelpers } from "./turretSlotRules.js";
import { getHelperMarch, getTurretMetrics } from "./turretAssignments.js";

export const MIN_AUTO_MARCH = 1000;

function minMarch(player, settings) {
  return Math.min(MIN_AUTO_MARCH, getHelperMarch(player, settings));
}

/** Return snapshots of old helper marches only for turrets which can gain a seat
 * after compacting. No eligible reserve player => no changes to manual marches. */
export function prepareAutoSeatSpace(assignments, players, settings, targets, context) {
  const snapshots = new Map();
  for (const { shift, tower } of targets) {
    const slot = assignments.shifts[shift][tower];
    if (!slot.captainId || slot.helperIds.length === 0 ||
      slot.helperIds.length >= getTowerMaxHelpers(assignments, shift, tower, settings)) continue;
    const captain = context.roster.get(slot.captainId);
    if (!captain) continue;
    const oldMetrics = getTurretMetrics(slot, players, settings, context.roster);
    if (oldMetrics.free >= MIN_AUTO_MARCH) continue;
    const minimumCurrent = slot.helperIds.reduce((total, id) =>
      total + minMarch(context.roster.get(id), settings), 0);
    if (oldMetrics.rallySize <= minimumCurrent) continue;
    const towerSettings = effectiveTowerSettings(settings, assignments, shift, tower);
    const candidate = eligibleAutoPlayers({
      players, assignments, settings: towerSettings, shift, captain, purpose: "helper", context,
    }).find((player) => minMarch(player, settings) > 0 &&
      oldMetrics.rallySize - minimumCurrent >= minMarch(player, settings));
    if (!candidate) continue;
    const original = { ...slot.helperMarches };
    for (const id of slot.helperIds) {
      const player = context.roster.get(id);
      const value = minMarch(player, settings);
      if (value > 0) slot.helperMarches[id] = Math.min(slot.helperMarches[id], value);
    }
    snapshots.set(`${shift}:${tower}`, { shift, tower, original, originalCount: slot.helperIds.length });
  }
  return snapshots;
}

/** Restore every original march if no additional player joined that turret.
 * Otherwise, allow existing and new helpers to share the remaining rally. */
export function restoreUnneededCompactions(assignments, snapshots, newHelpers) {
  const growable = new Set(newHelpers);
  for (const item of snapshots.values()) {
    const slot = assignments.shifts[item.shift][item.tower];
    if (slot.helperIds.length === item.originalCount) {
      slot.helperMarches = { ...item.original };
    } else {
      for (const id of Object.keys(item.original)) growable.add(id);
    }
  }
  return growable;
}
