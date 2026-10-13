import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { TURRET_IDS, TURRET_ICON_URLS } from "../../../features/turrets/plannerConstants.js";

function TurretList({ a, shift, assignments, players, selected, onSelect }) {
  const roster = new Map(players.map((p) => [String(p.id), p]));
  return (
    <aside className="turret-list" aria-label={a.distribution.subtabs.turrets}>
      {TURRET_IDS.map((id) => {
        const slot = assignments.shifts[shift][id];
        const captain = roster.get(slot.captainId);
        return (
          <button key={id} type="button" aria-pressed={selected === id}
            className={selected === id ? "turret-list-card turret-list-card--active" : "turret-list-card"}
            onClick={() => onSelect(id)}>
            <div className="turret-list-card__icon">
              <img src={TURRET_ICON_URLS[id]} alt="" aria-hidden="true" />
            </div>
            <div>
              <strong>{a.distribution.towers[id]}</strong>
              <span>{captain?.nickname || a.distribution.turret.noCaptain}</span>
              <small>{a.distribution.players}: {slot.helperIds.length + (captain ? 1 : 0)}</small>
            </div>
            {captain ? <CheckCircle2 className="turret-list-card__ok" size={20} aria-hidden="true" />
              : <AlertTriangle className="turret-list-card__warn" size={20} aria-hidden="true" />}
          </button>
        );
      })}
    </aside>
  );
}
export default TurretList;
