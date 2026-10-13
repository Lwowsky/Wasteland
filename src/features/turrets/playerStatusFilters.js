import { locateAssignment } from "./turretAssignments.js";
import { getPlannerShift } from "./plannerPlayers.js";

/** Read-only rows for admin status: filtering cannot mutate a working plan. */
export function filterPlayerStatus(players, assignments, { status = "all", shift = "all", search = "" } = {}) {
  const needle = String(search).trim().toLocaleLowerCase();
  return (Array.isArray(players) ? players : []).flatMap((player) => {
    const location = locateAssignment(assignments, player.id);
    const inTurret = Boolean(location);
    if (status === "turrets" && !inTurret) return [];
    if (status === "reserve" && inTurret) return [];
    // An assigned player's effective shift is the turret shift, not their original registration.
    const effectiveShift = location?.shift || getPlannerShift(player);
    if (shift !== "all" && shift !== effectiveShift) return [];
    if (needle && !`${player.nickname || ""} ${player.alliance || ""}`.toLocaleLowerCase().includes(needle)) return [];
    return [{ player, location }];
  });
}
