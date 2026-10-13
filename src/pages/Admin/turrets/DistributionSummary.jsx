import { useMemo } from "react";
import PlayersStatsCards from "../players/PlayersStatsCards.jsx";
import { getActivePlannerShifts } from "../../../features/turrets/plannerShifts.js";
import "./DistributionSummary.css";

function DistributionSummary({ a, players, assignments, registrationSettings, loaded }) {
  const availableShifts = registrationSettings?.availableShifts;
  const activeShifts = getActivePlannerShifts(availableShifts);
  const cardShifts = {
    ...Object.fromEntries(activeShifts.map((shift) => [shift, true])),
    flexible: availableShifts?.flexible !== false,
  };
  const assignedIds = useMemo(() => {
    const ids = new Set();
    for (const towers of Object.values(assignments?.shifts || {})) {
      for (const slot of Object.values(towers || {})) {
        if (slot?.captainId) ids.add(String(slot.captainId));
        for (const id of slot?.helperIds || []) ids.add(String(id));
      }
    }
    return ids;
  }, [assignments]);
  const labels = useMemo(() => ({
    shifts: a.shifts,
    troops: a.troops,
    stats: {
      total: a.distribution.summary.total,
      players: a.distribution.players,
      captains: a.distribution.turret.captain,
      inTurrets: a.distribution.summary.inTurrets,
      reserve: a.distribution.summary.reserve,
    },
  }), [a]);
  return (
    <div className="planner-summary-shell" aria-busy={!loaded}>
      {loaded ? <PlayersStatsCards t={labels} players={players} availableShifts={cardShifts}
        assignedPlayerIds={assignedIds} /> : <p className="planner-summary-loading" role="status">
          {a.distribution.planner.loading}
        </p>}
    </div>
  );
}

export default DistributionSummary;
