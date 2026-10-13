import { useState } from "react";
import { getTowerRule, getTowerMaxHelpers, updateTowerRule } from "../../../features/turrets/turretSlotRules.js";
import { recalculateTurret } from "../../../features/turrets/turretRecalculate.js";
import { TIER_DEFAULTS } from "../../../features/turrets/plannerConstants.js";

const TIERS = Object.keys(TIER_DEFAULTS).sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)));

/** One independent form per shift and turret; never modifies another slot. */
function TurretTowerLimits({ a, assignments, players, settings, shift, tower, availableTiers, disabled, onApply, onFeedback }) {
  const labels = a.distribution.towerEditor;
  const stored = getTowerRule(assignments, shift, tower).tierLimits || {};
  const [limits, setLimits] = useState(() => Object.fromEntries(TIERS.map((tier) => [tier, stored[tier] ?? 0])));
  const inheritedLimit = getTowerMaxHelpers(assignments, shift, tower, settings);
  const [maxHelpers, setMaxHelpers] = useState(() => String(inheritedLimit));
  const limitValid = maxHelpers !== "" && /^\d+$/.test(String(maxHelpers)) &&
    Number(maxHelpers) >= 0 && Number(maxHelpers) <= 29;
  const visible = TIERS.filter((tier) => !availableTiers || availableTiers[tier] === true);

  function prepare() {
    return updateTowerRule(assignments, shift, tower, { tierLimits: Object.fromEntries(
      visible.map((tier) => [tier, Number(limits[tier] || 0)])), maxHelpers: Number(maxHelpers) });
  }

  function save() {
    if (!limitValid) return;
    const result = onApply(() => prepare());
    if (result !== false) onFeedback(labels.limitsSaved);
  }

  function recalculate() {
    if (!limitValid) return;
    const result = onApply(() => {
      const prepared = prepare();
      return prepared.error ? prepared : recalculateTurret(prepared.assignments, shift, tower, players, settings);
    });
    if (result !== false) onFeedback(labels.recalculated);
  }

  function reset() {
    const cleared = Object.fromEntries(TIERS.map((tier) => [tier, 0]));
    const result = onApply((current) => updateTowerRule(current, shift, tower, { tierLimits: cleared, maxHelpers: null }));
    if (result !== false) { setLimits(cleared); setMaxHelpers(String(settings.maxHelpers ?? 29)); onFeedback(labels.limitsReset); }
  }

  return (
    <details className="turret-details-box turret-tower-limits">
      <summary>{a.distribution.turret.settingsAndLimits}</summary>
      <div className="turret-tower-limits__body">
        <div className="turret-tower-limits__fields">
          {visible.map((tier) => (
            <label className="admin-field" key={tier}>
              <span>{tier}</span>
              <input type="number" min="0" max="10000000" step="1000" value={limits[tier]}
                disabled={disabled} onChange={(event) => setLimits((old) => ({ ...old, [tier]: event.target.value }))} />
            </label>
          ))}
        </div>
        <p>{labels.zeroTierHint}</p>
        <div className="turret-tower-limits__footer">
          <label className="admin-field turret-tower-limits__max">
            <span>{labels.maxHelpers}</span>
            <input type="number" min="0" max="29" step="1" value={maxHelpers} disabled={disabled}
              onChange={(event) => setMaxHelpers(event.target.value)} aria-label={labels.maxHelpers} />
          </label>
          <div className="turret-tower-limits__actions">
            <button type="button" className="admin-secondary-button" disabled={disabled || !limitValid} onClick={save}>{labels.saveLimits}</button>
            <button type="button" className="admin-primary-button" disabled={disabled || !limitValid} onClick={recalculate}>{labels.recalculate}</button>
            <button type="button" className="admin-secondary-button" disabled={disabled} onClick={reset}>{labels.resetLimits}</button>
          </div>
        </div>
      </div>
    </details>
  );
}
export default TurretTowerLimits;
