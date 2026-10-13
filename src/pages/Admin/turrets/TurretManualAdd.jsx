import { useState } from "react";
import { REGISTRATION_TIERS } from "../../../../shared/registrationConfig.js";
import {
  getHelperCandidates,
  getHelperMarch,
} from "../../../features/turrets/turretAssignments.js";
import {
  effectiveTowerSettings,
  getTowerMaxHelpers,
} from "../../../features/turrets/turretSlotRules.js";
import { formatMarch } from "../../../utils/formatMarch.js";

const tiers = [...REGISTRATION_TIERS].reverse();
const initial = () => ({
  nickname: "", alliance: "", troopType: "fighter", tier: "T14",
  marchSize: "", rallySize: "0", role: "helper",
});

/** One editor for either an existing reserve player or a new plan-only player. */
function TurretManualAdd({
  a, language, shift, tower, assignments, players, settings,
  disabled, availableTiers, onAdd, onCreate,
}) {
  const labels = a.distribution.towerEditor;
  const [mode, setMode] = useState("reserve");
  const [choice, setChoice] = useState("");
  const [form, setForm] = useState(initial);

  const slot = assignments.shifts[shift][tower];
  const maxHelpers = getTowerMaxHelpers(assignments, shift, tower, settings);
  const helperCount = slot.helperIds.length;
  const full = helperCount >= maxHelpers;
  const hasCaptain = Boolean(slot.captainId);
  const allowedTiers = tiers.filter((tier) => !availableTiers || availableTiers[tier] === true);
  const activeTier = allowedTiers.includes(form.tier) ? form.tier : (allowedTiers[0] || "T14");
  const candidates = getHelperCandidates(assignments, players, shift, tower, settings);
  const validChoice = candidates.some((player) => String(player.id) === choice) ? choice : "";
  const towerSettings = effectiveTowerSettings(settings, assignments, shift, tower);

  const update = (field) => (event) => setForm((old) => ({ ...old, [field]: event.target.value }));

  function addFromReserve(event) {
    event.preventDefault();
    if (validChoice && onAdd(validChoice)) setChoice("");
  }

  function addNewPlayer(event) {
    event.preventDefault();
    if (onCreate({ ...form, tier: activeTier })) {
      setForm({ ...initial(), tier: allowedTiers[0] || "T14" });
    }
  }

  return (
    <details className="turret-details-box turret-manual-add">
      <summary>{a.distribution.turret.addManual}</summary>
      <div className="turret-manual-add__body">
        <div className="turret-manual-add__modes" role="group" aria-label={labels.addSource}>
          <button type="button" className={`turret-manual-add__mode${mode === "reserve" ? " is-active" : ""}`}
            aria-pressed={mode === "reserve"} onClick={() => setMode("reserve")}>{labels.fromReserve}</button>
          <button type="button" className={`turret-manual-add__mode${mode === "new" ? " is-active" : ""}`}
            aria-pressed={mode === "new"} onClick={() => setMode("new")}>{labels.newPlayer}</button>
        </div>

        {mode === "reserve" ? (
          <form className="turret-manual-add__reserve" onSubmit={addFromReserve}>
            <label className="admin-field turret-manual-add__reserve-select">
              <span>{a.distribution.turret.player}</span>
              <select value={validChoice} disabled={disabled || !hasCaptain || full}
                onChange={(event) => setChoice(event.target.value)}>
                <option value="">{a.distribution.manual.selectPlayer}</option>
                {candidates.map((player) => (
                  <option key={player.id} value={String(player.id)}>
                    {player.nickname} · {player.alliance || "—"} · {a.troops[player.troopType] || player.troopType} {player.tier || ""} · {formatMarch(getHelperMarch(player, towerSettings), language)}
                  </option>
                ))}
              </select>
            </label>
            <button className="admin-primary-button" type="submit"
              disabled={disabled || !hasCaptain || full || !validChoice}>
              {a.distribution.manual.add}
            </button>
            <small className="turret-manual-add__hint">
              {!hasCaptain ? a.distribution.manual.errors.noCaptain
                : full ? a.distribution.manual.errors.full
                  : candidates.length === 0 ? labels.noReserveCandidates
                    : labels.helpersUsed.replace("{{count}}", String(helperCount)).replace("{{max}}", String(maxHelpers))}
            </small>
          </form>
        ) : (
          <form className="turret-manual-add__new" onSubmit={addNewPlayer}>
            <p>{labels.manualNote}</p>
            <div className="turret-manual-add__grid">
              <label className="admin-field"><span>{labels.nickname}</span>
                <input value={form.nickname} maxLength={90} onChange={update("nickname")}
                  disabled={disabled} required /></label>
              <label className="admin-field"><span>{a.distribution.columns.alliance}</span>
                <input value={form.alliance} maxLength={80} onChange={update("alliance")}
                  disabled={disabled} /></label>
              <label className="admin-field"><span>{labels.role}</span>
                <select value={form.role} onChange={update("role")} disabled={disabled}>
                  <option value="helper">{a.distribution.manual.helper}</option>
                  <option value="captain">{a.distribution.turret.captain}</option>
                </select></label>
              <label className="admin-field"><span>{labels.troopType}</span>
                <select value={form.troopType} onChange={update("troopType")} disabled={disabled}>
                  {Object.entries(a.troops).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select></label>
              <label className="admin-field"><span>{a.distribution.columns.tier}</span>
                <select value={activeTier} onChange={update("tier")} disabled={disabled}>
                  {allowedTiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                </select></label>
              <label className="admin-field"><span>{a.distribution.columns.march}</span>
                <input type="number" min="1" max="10000000" value={form.marchSize}
                  onChange={update("marchSize")} disabled={disabled} required /></label>
              {form.role === "captain" && (
                <label className="admin-field"><span>{a.distribution.turret.rally}</span>
                  <input type="number" min="0" max="20000000" value={form.rallySize}
                    onChange={update("rallySize")} disabled={disabled} /></label>
              )}
            </div>
            <button className="admin-primary-button" type="submit"
              disabled={disabled || allowedTiers.length === 0 || (!hasCaptain && form.role === "helper") ||
                (full && form.role === "helper") || !form.nickname.trim() || !form.marchSize}>
              {form.role === "captain" ? a.distribution.turret.setCaptain : a.distribution.manual.add}
            </button>
            {form.role === "helper" && (!hasCaptain || full) && (
              <small className="turret-manual-add__hint">
                {!hasCaptain ? a.distribution.manual.errors.noCaptain : a.distribution.manual.errors.full}
              </small>
            )}
          </form>
        )}
      </div>
    </details>
  );
}

export default TurretManualAdd;
