import { useState } from "react";
import { getCaptainCandidates } from "../../../features/turrets/turretAssignments.js";

function TurretCaptainEditor({ a, shift, tower, assignments, players, settings, disabled, onSetCaptain }) {
  const current = assignments.shifts[shift][tower].captainId || "";
  const [choice, setChoice] = useState(current);
  const candidates = getCaptainCandidates(assignments, players, shift, tower, settings);
  return (
    <div className="turret-captain-row turret-captain-row--editor">
      <label className="admin-field">
        <span>{a.distribution.turret.captain}</span>
        <select value={choice} disabled={disabled} onChange={(e) => setChoice(e.target.value)}>
          <option value="">{a.distribution.turret.noCaptain}</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname} · {p.alliance || "—"} · {a.troops[p.troopType] || p.troopType} {p.tier || ""}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="admin-primary-button"
        disabled={disabled || choice === current} onClick={() => onSetCaptain(choice)}>
        {a.distribution.turret.setCaptain}
      </button>
    </div>
  );
}
export default TurretCaptainEditor;
