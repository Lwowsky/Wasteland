import { getHelperMarch } from "./turretAssignments.js";
import { comparePlayersByTier } from "./tierPriority.js";
import { getTowerRule } from "./turretSlotRules.js";

/** Recalculate ONLY one (shift, turret), without moving players or captains.
 * Zero tier limit keeps the current march, as in the original planner.
 * If over rally, reduce low tiers first but never assign a zero march.
 */
export function recalculateTurret(assignments, shift, tower, players, settings) {
  const slot = assignments?.shifts?.[shift]?.[tower];
  if (!slot?.captainId) return { error: "noCaptain" };
  if (!slot.helperIds.length) return { error: "noHelpers" };
  const roster = new Map(players.map((p) => [String(p.id), p]));
  const captain = roster.get(slot.captainId);
  if (!captain) return { error: "unavailable" };
  const limits = getTowerRule(assignments, shift, tower).tierLimits || {};
  if (!Object.values(limits).some((value) => value > 0)) return { assignments, unchanged: true };
  const next = structuredClone(assignments);
  const target = next.shifts[shift][tower];
  const helpers = slot.helperIds.map((id) => roster.get(id)).filter(Boolean);
  if (helpers.length !== slot.helperIds.length) return { error: "unavailable" };
  const desired = {};
  for (const player of helpers) {
    const id = String(player.id);
    const limit = Number(limits[player.tier] || 0);
    const globalCap = getHelperMarch(player, settings);
    const raw = limit > 0 ? Math.min(globalCap, limit) : Math.min(globalCap, slot.helperMarches[id]);
    if (raw < 1) return { error: "noRoom" };
    desired[id] = Math.floor(raw);
  }
  const rally = Math.floor(Number(captain.rallySize || 0));
  if (rally < helpers.length) return { error: "noRoom" };
  let overflow = Object.values(desired).reduce((sum, value) => sum + value, 0) - rally;
  // Low tiers lose march first; strong players remain above weaker tiers.
  if (overflow > 0) {
    const weakFirst = [...helpers].sort((a, b) => comparePlayersByTier(b, a));
    for (const player of weakFirst) {
      const id = String(player.id);
      const reduction = Math.min(overflow, desired[id] - 1);
      desired[id] -= reduction;
      overflow -= reduction;
      if (overflow <= 0) break;
    }
  }
  if (overflow > 0) return { error: "noRoom" };

  // Match the old planner: after enforcing explicitly capped tiers, allocate
  // leftover rally among uncapped LOWER tiers. Do not grow explicitly capped
  // or higher tiers beyond their current allocation.
  const explicit = helpers.filter((player) => Number(limits[player.tier] || 0) > 0)
    .map((player) => Number(String(player.tier).slice(1)));
  const lowestCappedTier = Math.min(...explicit);
  let remaining = rally - Object.values(desired).reduce((sum, march) => sum + march, 0);
  let queue = helpers.filter((player) => Number(String(player.tier).slice(1)) < lowestCappedTier)
    .sort(comparePlayersByTier);
  // Number of assistants is bounded by 29. The loop also terminates when
  // every candidate has reached its actual march/global cap.
  for (let round = 0; queue.length && remaining > 0 && round < 100; round++) {
    const slice = Math.max(1, Math.floor(remaining / queue.length));
    const pending = [];
    let used = 0;
    for (const player of queue) {
      const id = String(player.id);
      const available = getHelperMarch(player, settings) - desired[id];
      const added = Math.min(Math.max(0, available), slice, remaining - used);
      if (added > 0) { desired[id] += added; used += added; }
      if (desired[id] < getHelperMarch(player, settings)) pending.push(player);
    }
    if (!used) break;
    remaining -= used;
    queue = pending;
  }
  target.helperMarches = desired;
  return { assignments: next, unchanged: JSON.stringify(slot.helperMarches) === JSON.stringify(desired) };
}
