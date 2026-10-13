import { PLANNER_SHIFTS, TURRET_IDS } from "./plannerConstants.js";
import { getShiftCapacityStatus } from "./shiftCapacity.js";

// Origin alliance names are used for display and optional fairness scoring only.
// Players join ONE shared Wasteland alliance for the event.
export function allianceKey(player) {
  return String(player?.alliance || player?.allianceTag || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("en");
}

export function getAllianceShiftCounts(assignments, players) {
  const roster = players instanceof Map ? players :
    new Map((players || []).map((p) => [String(p.id), p]));
  return Object.fromEntries(PLANNER_SHIFTS.map((shift) => {
    const counts = new Map();
    const names = new Map();
    for (const tower of TURRET_IDS) {
      const slot = assignments?.shifts?.[shift]?.[tower];
      if (!slot) continue;
      for (const id of [slot.captainId, ...(slot.helperIds || [])]) {
        if (id === null || id === undefined || id === "") continue;
        const player = roster.get(String(id));
        if (!player) continue;
        const key = allianceKey(player);
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!names.has(key)) names.set(key, String(player.alliance || player.allianceTag || "").trim());
      }
    }
    return [shift, { counts, names }];
  }));
}

// One total capacity per shift. Breakdowns are by the player's ORIGINAL alliance
// and never multiply that capacity by the number of registered alliances.
export function summarizeSharedAllianceCapacity(assignments, players, settings) {
  const byShift = getAllianceShiftCounts(assignments, players);
  return PLANNER_SHIFTS.map((shift) => {
    const usage = getShiftCapacityStatus(assignments, settings, shift);
    const { counts, names } = byShift[shift];
    const alliances = [...counts].map(([key, count]) => ({
      key, label: names.get(key) || "", count,
    })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "en"));
    return { ...usage, alliances };
  });
}
