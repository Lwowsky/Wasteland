import { PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";
import {
  eligibleAutoPlayers, canAutoUsePlayer, autoPlayerId, createAutoContext, recordAutoPlacement,
} from "./autoCandidates.js";
import { allianceKey } from "./allianceRules.js";
import { comparePlayersByTier, sameTierAndMarch } from "./tierPriority.js";
import { MIN_AUTO_MARCH, prepareAutoSeatSpace, restoreUnneededCompactions } from "./autoMarchFit.js";
import { effectiveTowerSettings, getTowerMaxHelpers } from "./turretSlotRules.js";
import { compareRedistributedHelpers, releaseAllTurretHelpers } from "./turretRedistribution.js";
import {
  getHelperMarch, getTurretMetrics,
} from "./turretAssignments.js";

const SHIFT_ORDER = [...PLANNER_SHIFTS];
const TOWER_ORDER = [...TURRET_IDS];

function filled(slot) {
  return Boolean(slot.captainId);
}

function missingCaptainSlots(assignments, scope) {
  return scope.filter(({ shift, tower }) => !filled(assignments.shifts[shift][tower]));
}

function allTargets(activeShifts = SHIFT_ORDER) {
  return activeShifts.flatMap((shift) => TOWER_ORDER.map((tower) => ({ shift, tower })));
}

function getTargets(operation, shift, tower, activeShifts) {
  if (operation === "tower") {
    return activeShifts.includes(shift) && TOWER_ORDER.includes(tower) ? [{ shift, tower }] : null;
  }
  return operation === "fill" || operation === "redistribute" ? allTargets(activeShifts) : null;
}

function captainStage(next, players, settings, targets, context) {
  let added = 0;
  // Reserve suitable captains for both shifts BEFORE filling helpers.
  for (const { shift, tower } of missingCaptainSlots(next, targets)) {
    const towerSettings = effectiveTowerSettings(settings, next, shift, tower);
    const candidates = eligibleAutoPlayers({ players, assignments: next, settings: towerSettings, shift, purpose: "captain", context });
    if (settings.mode === "balanced") {
      const counts = context.alliances[shift].counts;
      candidates.sort((a, b) => (counts.get(allianceKey(a)) || 0) - (counts.get(allianceKey(b)) || 0));
    }
    const candidate = candidates[0];
    if (!candidate) continue;
    next.shifts[shift][tower].captainId = autoPlayerId(candidate);
    recordAutoPlacement(context, candidate, shift);
    added++;
  }
  return added;
}

function candidateTowers(next, players, settings, targets, player, context) {
  const roster = context.roster;
  return targets.flatMap(({ shift, tower }) => {
    const slot = next.shifts[shift][tower];
    if (!slot.captainId || slot.helperIds.length >= getTowerMaxHelpers(next, shift, tower, settings)) return [];
    const captain = roster.get(slot.captainId);
    const towerSettings = effectiveTowerSettings(settings, next, shift, tower);
    if (!captain || towerSettings.sameTroopType && captain.troopType !== player.troopType) return [];
    if (!canAutoUsePlayer({ player, assignments: next, settings: towerSettings, shift, captain,
      purpose: "helper", roster, context })) return [];
    const metrics = getTurretMetrics(slot, players, settings, roster);
    return metrics.free > 0 ? [{ shift, tower, slot, free: metrics.free, metrics }] : [];
  });
}

function choiceCompare(a, b, mode) {
  if (mode === "maxMarch") {
    return b.free - a.free || b.slot.helperIds.length - a.slot.helperIds.length ||
      SHIFT_ORDER.indexOf(a.shift) - SHIFT_ORDER.indexOf(b.shift) ||
      TOWER_ORDER.indexOf(a.tower) - TOWER_ORDER.indexOf(b.tower);
  }
  const aRatio = a.metrics.rallySize ? a.metrics.helpersMarch / a.metrics.rallySize : 1;
  const bRatio = b.metrics.rallySize ? b.metrics.helpersMarch / b.metrics.rallySize : 1;
  return aRatio - bRatio || a.slot.helperIds.length - b.slot.helperIds.length ||
    b.free - a.free || SHIFT_ORDER.indexOf(a.shift) - SHIFT_ORDER.indexOf(b.shift) ||
    TOWER_ORDER.indexOf(a.tower) - TOWER_ORDER.indexOf(b.tower);
}

function addAutoHelper(next, players, settings, candidate, target, minimum) {
  const slot = next.shifts[target.shift][target.tower];
  const max = getHelperMarch(candidate, settings);
  const march = Math.min(target.free, max, minimum ? MIN_AUTO_MARCH : max);
  if (march <= 0) return false;
  const id = autoPlayerId(candidate);
  slot.helperIds.push(id);
  slot.helperMarches[id] = march;
  return true;
}

// Grow new helpers and any earlier helpers explicitly compacted to create
// additional seats. Never grow beyond the player's real march or tier cap.
function growNewHelpers(next, players, settings, newHelpers, balanced, roster) {
  for (const { shift, tower } of allTargets()) {
    const slot = next.shifts[shift][tower];
    const ids = slot.helperIds.filter((id) => newHelpers.has(id));
    if (!ids.length) continue;
    let free = getTurretMetrics(slot, players, settings, roster).free;
    if (free <= 0) continue;
    const ranked = ids.sort((a, b) => comparePlayersByTier(roster.get(a), roster.get(b)));
    if (!balanced) {
      for (const id of ranked) {
        const capacity = getHelperMarch(roster.get(id), settings) - slot.helperMarches[id];
        const extra = Math.min(Math.max(0, capacity), free);
        if (extra) slot.helperMarches[id] += extra;
        free -= extra;
        if (!free) break;
      }
      continue;
    }
    // Bounded weighted rounds. High tiers receive larger steps; every new
    // helper can grow while space remains, without starving low tiers.
    for (let round = 0; round < 500 && free > 0; round++) {
      let changed = false;
      for (const id of ranked) {
        const player = roster.get(id);
        const capacity = getHelperMarch(player, settings) - slot.helperMarches[id];
        if (capacity <= 0) continue;
        const tier = Number(String(player?.tier || "").replace(/\D/g, "")) || 0;
        const step = Math.max(1000, Math.round(15000 * Math.max(0.3, (tier - 6) / 7) / 1000) * 1000);
        const extra = Math.min(free, capacity, step);
        slot.helperMarches[id] += extra;
        free -= extra;
        changed = true;
        if (!free) break;
      }
      if (!changed) break;
    }
    // Finish at most the remaining small/very large capacities deterministically.
    if (free > 0) {
      for (const id of ranked) {
        const extra = Math.min(free, Math.max(0, getHelperMarch(roster.get(id), settings) - slot.helperMarches[id]));
        slot.helperMarches[id] += extra;
        free -= extra;
        if (!free) break;
      }
    }
  }
}

function assignRankedHelpers(next, players, settings, targets, ordered, context) {
  const newHelpers = new Set();
  for (const candidate of ordered) {
    const id = autoPlayerId(candidate);
    if (!id || context.occupied.has(id)) continue;
    const locations = candidateTowers(next, players, settings, targets, candidate, context);
    if (!locations.length) continue;
    locations.sort((a, b) => choiceCompare(a, b, settings.mode));
    if (addAutoHelper(next, players, settings, candidate, locations[0], true)) {
      newHelpers.add(id);
      recordAutoPlacement(context, candidate, locations[0].shift);
    }
  }
  return newHelpers;
}

// With alliance balancing enabled, take candidates from the least represented
// origin alliance IN THE TARGET SHIFT (fairness, not a per-alliance cap). Re-evaluate after every assignment,
// counting both captains and helpers, including already assigned manual seats.
function assignBalancedAllianceHelpers(next, players, settings, targets, ordered, context) {
  const groups = new Map();
  for (const [index, player] of ordered.entries()) {
    const key = allianceKey(player);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ player, index });
  }
  const newHelpers = new Set();
  while (true) {
    const usage = context.alliances;
    const choices = [];
    for (const [key, queue] of groups) {
      while (queue.length) {
        const current = queue[0];
        const locations = candidateTowers(next, players, settings, targets, current.player, context);
        // Space/eligibility only decreases during helper placement, so a
        // candidate who cannot fit may be permanently skipped this run.
        if (!locations.length) { queue.shift(); continue; }
        locations.sort((a, b) =>
          (usage[a.shift].counts.get(key) || 0) - (usage[b.shift].counts.get(key) || 0) ||
          choiceCompare(a, b, settings.mode));
        choices.push({ key, player: current.player, index: current.index,
          count: usage[locations[0].shift].counts.get(key) || 0 });
        break;
      }
    }
    if (!choices.length) break;
    const fewest = Math.min(...choices.map((choice) => choice.count));
    // One member per least represented alliance per pass; this keeps the
    // algorithm fair without O(players × alliances) global rescoring.
    for (const choice of choices.filter((item) => item.count === fewest)
      .sort((a, b) => a.index - b.index)) {
      const locations = candidateTowers(next, players, settings, targets, choice.player, context);
      groups.get(choice.key).shift();
      if (!locations.length) continue;
      locations.sort((a, b) =>
        (usage[a.shift].counts.get(choice.key) || 0) -
          (usage[b.shift].counts.get(choice.key) || 0) || choiceCompare(a, b, settings.mode));
      const target = locations[0];
      if (addAutoHelper(next, players, settings, choice.player, target, true)) {
        newHelpers.add(autoPlayerId(choice.player));
        recordAutoPlacement(context, choice.player, target.shift);
      }
    }
  }
  return newHelpers;
}

function helpersStage(next, players, settings, targets, context) {
  // Strict priority: T14 before T13 ... before T1, then actual march and ID.
  // Fairness between source alliances applies ONLY to equal-priority players.
  const ordered = [...players].sort(comparePlayersByTier);
  if (settings.mode !== "balanced") {
    return assignRankedHelpers(next, players, settings, targets, ordered, context);
  }
  const placed = new Set();
  for (let start = 0; start < ordered.length;) {
    let end = start + 1;
    while (end < ordered.length && sameTierAndMarch(ordered[start], ordered[end])) end++;
    const equalPriority = ordered.slice(start, end);
    for (const id of assignBalancedAllianceHelpers(next, players, settings, targets, equalPriority, context)) {
      placed.add(id);
    }
    start = end;
  }
  return placed;
}

/**
 * Pure, deterministic planning. Never writes D1, localStorage, or the public plan.
 * `fill`: preserves captains and helper seats. Existing helper marches are
 * compacted only if needed to make room for additional eligible players.
 * `redistribute`: preserves every captain, releases ALL helpers and refills.
 * `tower`: fills one specified turret without disturbing any other slot.
 */
export function runAutomaticDistribution({ assignments, players, settings, operation, shift, tower, activeShifts = SHIFT_ORDER }) {
  const validShifts = activeShifts.filter((item) => SHIFT_ORDER.includes(item));
  const targets = getTargets(operation, shift, tower, validShifts);
  if (!targets || !assignments?.shifts || !Array.isArray(players)) return { error: "invalid" };
  if (settings?.mode === "manual") return { error: "manualMode" };
  const cleared = operation === "redistribute" ? releaseAllTurretHelpers(assignments, validShifts) : null;
  if (cleared?.error) return { error: "invalid" };
  const next = cleared?.assignments || structuredClone(assignments);
  const released = cleared?.released || 0;
  const context = createAutoContext(next, players);
  const captainsAdded = captainStage(next, players, settings, targets, context);
  const compactions = operation === "redistribute" ? new Map() :
    prepareAutoSeatSpace(next, players, settings, targets, context);
  const newHelpers = helpersStage(next, players, settings, targets, context);
  const growableIds = restoreUnneededCompactions(next, compactions, newHelpers);
  growNewHelpers(next, players, settings, growableIds, settings.mode === "balanced", context.roster);
  // A manually selected captain is immutable to every automatic operation.
  // Catch regressions here before the editor is allowed to save the result.
  for (const currentShift of SHIFT_ORDER) {
    for (const currentTower of TOWER_ORDER) {
      const previous = assignments.shifts[currentShift]?.[currentTower]?.captainId;
      if (previous && next.shifts[currentShift]?.[currentTower]?.captainId !== previous) {
        return { error: "captainProtected" };
      }
    }
  }
  const resizedHelpers = [...compactions.values()].reduce((count, item) => {
    const slot = next.shifts[item.shift][item.tower];
    return count + Object.entries(item.original).filter(([id, value]) =>
      slot.helperMarches[id] !== value).length;
  }, 0);
  const helpersAdded = newHelpers.size;
  const changed = JSON.stringify(next) !== JSON.stringify(assignments);
  const movements = operation === "redistribute"
    ? compareRedistributedHelpers(assignments, next) : {};
  return {
    assignments: next,
    stats: { captainsAdded, helpersAdded, helpersReleased: released, resizedHelpers,
      unassigned: players.filter((p) => !context.occupied.has(autoPlayerId(p))).length,
      ...movements, changed },
  };
}
