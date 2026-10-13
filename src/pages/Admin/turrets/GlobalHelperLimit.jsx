import { publicAsset } from "../../../utils/publicAsset.js";

import { updatePlannerSettings } from "../../../features/turrets/plannerSettings.js";

/** One default for all turret/shift slots without a manual override. */
export default function GlobalHelperLimit({ a, settings, setSettings, disabled }) {
  const labels = a.distribution.limits;
  return <section className="planner-panel planner-global-helpers-panel">
    <div className="planner-global-helpers__description">
      <img className="planner-global-helpers__icon" src={publicAsset("/images/admin/icons/actions/players.webp")} alt="" aria-hidden="true" />
      <div><h3>{labels.globalHelpersTitle}</h3><p>{labels.globalHelpersDescription}</p></div>
    </div>
    <label className="planner-numeric-field planner-global-helpers__input">
      <span>{labels.globalHelpersLabel}</span>
      <input type="number" min="0" max="29" step="1" inputMode="numeric" disabled={disabled}
        value={settings.maxHelpers ?? 29}
        onChange={(event) => setSettings((current) => updatePlannerSettings(
          current, "maxHelpers", event.target.value === "" ? 0 : event.target.value))} />
    </label>
    <small className="planner-global-helpers__hint">{labels.globalHelpersHint}</small>
  </section>;
}
