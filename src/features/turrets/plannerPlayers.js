const SHIFTS = new Set(["shift1", "shift2", "shift3", "shift4"]);
const FLEXIBLE_SHIFTS = new Set(["flexible", "both", "any"]);
export function getPlannerShift(player) {
  const value = String(player?.shift || "").trim().toLowerCase();
  if (SHIFTS.has(value)) return value;
  if (FLEXIBLE_SHIFTS.has(value)) return "flexible";
  return "unknown";
}
// Registration rows contain player availability, NOT turret assignments.
export function summarizePlannerPlayers(rows) {
  const players = Array.isArray(rows) ? rows : [];
  const result = {
    shift1: 0, shift2: 0, flexible: 0, otherShifts: 0,
    unknown: 0, total: players.length, captains: 0,
    fighters: 0, riders: 0, shooters: 0,
    rolesByShift: Object.fromEntries(
      ["shift1", "shift2", "flexible", "total"].map((key) => [key, { fighter: 0, rider: 0, shooter: 0 }]),
    ),
  };
  for (const player of players) {
    const shift = getPlannerShift(player);
    if (["shift1", "shift2", "flexible"].includes(shift)) result[shift] += 1;
    else if (shift === "unknown") result.unknown += 1;
    else result.otherShifts += 1;
    if (player?.captain === true) result.captains += 1;
    const troopType = player?.troopType;
    if (["fighter", "rider", "shooter"].includes(troopType)) {
      result[`${troopType === "fighter" ? "fighters" : troopType === "rider" ? "riders" : "shooters"}`] += 1;
      result.rolesByShift.total[troopType] += 1;
      if (Object.hasOwn(result.rolesByShift, shift)) {
        result.rolesByShift[shift][troopType] += 1;
      }
    }
  }
  return result;
}
