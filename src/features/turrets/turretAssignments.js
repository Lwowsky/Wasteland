import {
  MAX_HELPERS_PER_TURRET,
  PLANNER_SHIFTS,
  TURRET_IDS,
} from "./plannerConstants.js";
import { getPlannerShift } from "./plannerPlayers.js";
import { countAssignedInShift, getShiftCapacity } from "./shiftCapacity.js";
import { comparePlayersByTier } from "./tierPriority.js";
import { copyPlanMetadata } from "./turretPlanPlayers.js";
import { effectiveTowerSettings, getTowerMaxHelpers } from "./turretSlotRules.js";

export const ASSIGNMENT_VERSION = 1;

function emptySlot() {
  return { captainId: null, helperIds: [], helperMarches: {} };
}

export function createEmptyAssignments() {
  return {
    version: ASSIGNMENT_VERSION,
    shifts: Object.fromEntries(PLANNER_SHIFTS.map((shift) => [
      shift,
      Object.fromEntries(TURRET_IDS.map((tower) => [tower, emptySlot()])),
    ])),
  };
}

// Old drafts saved before four-shift support contain only shift1/shift2.
// Keep existing assignments intact while adding empty slots for new shifts.
export function completeAssignmentShifts(raw) {
  const next = createEmptyAssignments();
  for (const shift of PLANNER_SHIFTS) {
    for (const tower of TURRET_IDS) {
      const slot = raw?.shifts?.[shift]?.[tower];
      if (slot) next.shifts[shift][tower] = structuredClone(slot);
    }
  }
  return copyPlanMetadata(raw, next);
}

function rosterMap(players) {
  return new Map((Array.isArray(players) ? players : [])
    .filter((p) => p && p.id !== null && p.id !== undefined)
    .map((p) => [String(p.id), p]));
}

function idValue(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function toMarch(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

// Reconcile stale local ids after an import, a cycle change, or a database edit.
// Each player may appear only ONCE across both shifts, including captain slots.
export function normalizeAssignments(raw, players) {
  const next = createEmptyAssignments();
  const roster = rosterMap(players);
  const seen = new Set();
  const source = raw?.shifts || {};
  // Reserve every manually selected captain before considering any helper.
  // A stale helper entry must never take precedence over a captain elsewhere.
  const captainIds = new Set();
  for (const shift of PLANNER_SHIFTS) {
    for (const tower of TURRET_IDS) {
      const captainId = idValue(source[shift]?.[tower]?.captainId);
      if (!captainId || captainIds.has(captainId)) continue;
      captainIds.add(captainId);
      next.shifts[shift][tower].captainId = captainId;
      seen.add(captainId);
    }
  }
  for (const shift of PLANNER_SHIFTS) {
    for (const tower of TURRET_IDS) {
      const slot = source[shift]?.[tower] || {};
      const rawHelpers = Array.isArray(slot.helperIds) ? slot.helperIds : [];
      let remaining = toMarch(roster.get(next.shifts[shift][tower].captainId)?.rallySize);
      for (const value of rawHelpers) {
        const id = idValue(value);
        if (!id || !roster.has(id) || seen.has(id)) continue;
        if (!next.shifts[shift][tower].captainId) break; // No helpers without a captain.
        if (next.shifts[shift][tower].helperIds.length >= MAX_HELPERS_PER_TURRET || remaining === 0) break;
        const entered = slot.helperMarches?.[id];
        const player = roster.get(id);
        const maxMarch = toMarch(player?.marchSize);
        const march = Math.min(remaining, maxMarch, entered === undefined ? maxMarch : toMarch(entered));
        if (march === 0) continue;
        next.shifts[shift][tower].helperIds.push(id);
        next.shifts[shift][tower].helperMarches[id] = march;
        remaining -= march;
        seen.add(id);
      }
    }
  }
  return copyPlanMetadata(raw, next);
}

export function locateAssignment(assignments, playerId) {
  const id = idValue(playerId);
  if (!id) return null;
  for (const shift of PLANNER_SHIFTS) {
    for (const tower of TURRET_IDS) {
      const slot = assignments?.shifts?.[shift]?.[tower];
      if (slot?.captainId === id) return { shift, tower, role: "captain" };
      if (slot?.helperIds?.includes(id)) return { shift, tower, role: "helper" };
    }
  }
  return null;
}

export function availableForShift(player, shift, settings) {
  if (!PLANNER_SHIFTS.includes(shift)) return false;
  if (!settings?.respectShift) return true;
  const available = getPlannerShift(player);
  return available === shift || (available === "flexible" && settings.allowFlexible);
}

export function getCaptainCandidates(assignments, players, shift, tower, settings) {
  settings = effectiveTowerSettings(settings, assignments, shift, tower);
  const selected = assignments?.shifts?.[shift]?.[tower]?.captainId;
  return (Array.isArray(players) ? players : [])
    .filter((player) => {
      const id = idValue(player?.id);
      if (!id) return false;
      if (id === selected) return true;
      if (locateAssignment(assignments, id)) return false;
      // Swapping an existing captain does not add a new occupied seat.
      if (!selected && countAssignedInShift(assignments, shift) >= getShiftCapacity(settings, shift)) return false;
      if (settings?.onlyCaptains && player.captain !== true) return false;
      return availableForShift(player, shift, settings);
    })
    .sort((a, b) => toMarch(b.rallySize) - toMarch(a.rallySize) ||
      toMarch(b.marchSize) - toMarch(a.marchSize) ||
      String(a.nickname || "").localeCompare(String(b.nickname || "")));
}

export function getHelperMarch(player, settings) {
  const march = toMarch(player?.marchSize);
  const cap = settings?.tierLimitsEnabled ? toMarch(settings.tierLimits?.[player?.tier]) : 0;
  return cap > 0 ? Math.min(march, cap) : march;
}

export function getTurretMetrics(slot, players, settings, roster = null) {
  // Reuse the per-operation roster during auto distribution instead of rebuilding it.
  roster ||= rosterMap(players);
  const captain = roster.get(idValue(slot?.captainId)) || null;
  const captainMarch = toMarch(captain?.marchSize);
  const rallySize = toMarch(captain?.rallySize);
  const capacity = captain ? captainMarch + rallySize : 0;
  const helpersMarch = (slot?.helperIds || []).reduce((sum, id) => {
    const player = roster.get(id);
    const cap = getHelperMarch(player, settings);
    return sum + Math.min(cap, toMarch(slot?.helperMarches?.[id]));
  }, 0);
  return {
    captainMarch, rallySize, capacity,
    helpersMarch,
    used: captainMarch + helpersMarch,
    free: Math.max(0, rallySize - helpersMarch),
  };
}

export function changeCaptain(assignments, shift, tower, playerId, players, settings) {
  settings = effectiveTowerSettings(settings, assignments, shift, tower);
  const id = idValue(playerId);
  if (!PLANNER_SHIFTS.includes(shift) || !TURRET_IDS.includes(tower)) return { error: "invalid" };
  const slot = assignments.shifts[shift][tower];
  if (slot.captainId === (id || null)) return { assignments };
  if (slot.helperIds.length) return { error: "helpersPresent" };
  // Changing an existing captain does not increase the number of players.
  const occupied = countAssignedInShift(assignments, shift) - (slot.captainId ? 1 : 0);
  if (id && occupied >= getShiftCapacity(settings, shift)) return { error: "shiftFull" };
  if (id && !getCaptainCandidates(assignments, players, shift, tower, settings)
    .some((player) => String(player.id) === id)) return { error: "unavailable" };
  const next = structuredClone(assignments);
  next.shifts[shift][tower].captainId = id || null;
  return { assignments: next };
}

export function getHelperCandidates(assignments, players, shift, tower, settings) {
  settings = effectiveTowerSettings(settings, assignments, shift, tower);
  const slot = assignments?.shifts?.[shift]?.[tower];
  if (!slot?.captainId || getTurretMetrics(slot, players, settings).free <= 0 ||
    slot.helperIds.length >= getTowerMaxHelpers(assignments, shift, tower, settings) ||
    countAssignedInShift(assignments, shift) >= getShiftCapacity(settings, shift)) return [];
  const roster = rosterMap(players);
  const captain = roster.get(slot.captainId);
  if (!captain) return [];
  return (Array.isArray(players) ? players : []).filter((player) => {
    if (!idValue(player?.id) || locateAssignment(assignments, player.id)) return false;
    if (!availableForShift(player, shift, settings)) return false;
    if (settings.sameTroopType && player.troopType !== captain.troopType) return false;
    return getHelperMarch(player, settings) > 0;
  }).sort(comparePlayersByTier);
}

export function addHelper(assignments, shift, tower, playerId, players, settings) {
  settings = effectiveTowerSettings(settings, assignments, shift, tower);
  const id = idValue(playerId);
  const slot = assignments?.shifts?.[shift]?.[tower];
  if (!slot?.captainId) return { error: "noCaptain" };
  if (slot.helperIds.length >= getTowerMaxHelpers(assignments, shift, tower, settings)) return { error: "full" };
  const metrics = getTurretMetrics(slot, players, settings);
  if (!metrics.free) return { error: "noRoom" };
  if (countAssignedInShift(assignments, shift) >= getShiftCapacity(settings, shift)) {
    return { error: "shiftFull" };
  }
  const player = getHelperCandidates(assignments, players, shift, tower, settings)
    .find((row) => String(row.id) === id);
  if (!player) return { error: "unavailable" };
  const next = structuredClone(assignments);
  const target = next.shifts[shift][tower];
  target.helperIds.push(id);
  target.helperMarches[id] = Math.min(getHelperMarch(player, settings), metrics.free);
  return { assignments: next };
}

export function removeAssignedPlayer(assignments, id) {
  const location = locateAssignment(assignments, id);
  if (!location) return { assignments };
  const next = structuredClone(assignments);
  const slot = next.shifts[location.shift][location.tower];
  if (location.role === "captain") {
    // Captains cannot disappear while helpers depend on their rally.
    if (slot.helperIds.length) return { error: "helpersPresent" };
    slot.captainId = null;
  } else {
    slot.helperIds = slot.helperIds.filter((candidate) => candidate !== id);
    delete slot.helperMarches[id];
  }
  return { assignments: next };
}

export function clearTurret(assignments, shift, tower) {
  if (!PLANNER_SHIFTS.includes(shift) || !TURRET_IDS.includes(tower)) return { error: "invalid" };
  const next = structuredClone(assignments);
  next.shifts[shift][tower] = emptySlot();
  return { assignments: next };
}

export function getAssignmentSummary(assignments, players) {
  const occupied = (Array.isArray(players) ? players : []).filter((row) => locateAssignment(assignments, row.id));
  return { assigned: occupied.length, reserve: (players?.length || 0) - occupied.length, total: players?.length || 0 };
}

// Explicit conflicts after registration edits or rule changes. Never silently
// publish or persist a draft that contradicts its selected distribution rules.
export function findAssignmentConflicts(assignments, players, settings) {
  const roster = rosterMap(players);
  const conflicts = [];
  for (const shift of PLANNER_SHIFTS) {
    let shiftCount = 0;
    for (const tower of TURRET_IDS) {
      const slot = assignments?.shifts?.[shift]?.[tower];
      for (const id of [slot?.captainId, ...(slot?.helperIds || [])]) {
        const player = roster.get(String(id));
        if (!player) continue;
        shiftCount += 1;
        if (shiftCount > getShiftCapacity(settings, shift)) {
          conflicts.push({ shift, tower, playerId: String(id), reason: "sharedShiftCapacity" });
        }
      }
      if ((slot?.helperIds?.length || 0) > getTowerMaxHelpers(assignments, shift, tower, settings)) {
        conflicts.push({ shift, tower, reason: "full" });
      }
      const captain = roster.get(slot?.captainId);
      if (slot?.captainId && !captain) {
        conflicts.push({ shift, tower, playerId: String(slot.captainId), reason: "captainMissing" });
        continue;
      }
      if (!captain) continue;
      const towerSettings = effectiveTowerSettings(settings, assignments, shift, tower);
      if (towerSettings.onlyCaptains && captain.captain !== true) {
        conflicts.push({ shift, tower, playerId: slot.captainId, reason: "captain" });
      }
      if (!availableForShift(captain, shift, towerSettings)) {
        conflicts.push({ shift, tower, playerId: slot.captainId, reason: "shift" });
      }
      for (const id of slot.helperIds) {
        const player = roster.get(id);
        if (!player) continue;
        if (!availableForShift(player, shift, towerSettings)) {
          conflicts.push({ shift, tower, playerId: id, reason: "shift" });
        }
        if (towerSettings.sameTroopType && player.troopType !== captain.troopType) {
          conflicts.push({ shift, tower, playerId: id, reason: "troop" });
        }
        const assignedMarch = slot.helperMarches?.[id];
        if (!Number.isSafeInteger(assignedMarch) || assignedMarch <= 0 ||
          assignedMarch > getHelperMarch(player, settings)) {
          conflicts.push({ shift, tower, playerId: id, reason: "marchLimit" });
        }
      }
    }
  }
  return conflicts;
}

// One and only data adapter for both admin preview and future public publication.
export function toFinalPlanShape(assignments, players, shift, settings) {
  const roster = rosterMap(players);
  return Object.fromEntries(TURRET_IDS.map((tower) => {
    const slot = assignments?.shifts?.[shift]?.[tower] || emptySlot();
    const captain = roster.get(slot.captainId) || null;
    const helpers = (slot.helperIds || []).map((id) => roster.get(id)).filter(Boolean);
    return [tower, {
      troopType: captain?.troopType || null,
      captain,
      players: helpers.map((player) => ({
        ...player,
        marchSize: Math.min(getHelperMarch(player, settings), toMarch(slot.helperMarches?.[String(player.id)])),
      })).sort(comparePlayersByTier),
    }];
  }));
}
