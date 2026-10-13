import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { PLANNER_SHIFTS } from "../../../features/turrets/plannerConstants.js";
import { getActivePlannerShifts } from "../../../features/turrets/plannerShifts.js";
import { getAvailableFlexiblePlayers } from "../../../features/turrets/plannerShiftOverrides.js";
import { updatePlannerSettings } from "../../../features/turrets/plannerSettings.js";

const emptyRequests = () => Object.fromEntries(PLANNER_SHIFTS.map((shift) => [shift, 0]));

function NumberSetting({ label, value, disabled, max, onChange }) {
  return <label className="planner-numeric-field">
    <span>{label}</span>
    <input type="number" inputMode="numeric" min="0" max={max} step="1"
      value={value} disabled={disabled}
      onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))} />
  </label>;
}

function FlexibleShiftSettings({ a, settings, setSettings, disabled, registrations, assignments,
  registrationSettings, onApplyFlexible, onRestoreFlexible, onActionFeedback }) {
  const t = a.distribution.limits;
  const shifts = getActivePlannerShifts(registrationSettings?.availableShifts);
  const [requested, setRequested] = useState(emptyRequests);
  const available = getAvailableFlexiblePlayers(registrations, settings, assignments).length;
  const allocated = Object.values(settings.shiftOverrides || {});
  const countRequested = shifts.reduce((sum, shift) => sum + Number(requested[shift] || 0), 0);
  const invalid = shifts.some((shift) => !Number.isSafeInteger(requested[shift]) || requested[shift] < 0) ||
    countRequested > available;

  function update(key, value) {
    setSettings((current) => updatePlannerSettings(current, key, value));
  }
  function showResult(title, text, tone = "success") {
    onActionFeedback?.({ title, text, tone });
  }
  function apply() {
    const result = onApplyFlexible?.(...PLANNER_SHIFTS.map((shift) => requested[shift]));
    if (result?.error) {
      showResult(t.apply, t.feedback?.[result.error] || t.feedback?.notReady, "error");
      return;
    }
    setRequested(emptyRequests());
    const added = PLANNER_SHIFTS.reduce((total, shift, index) => total + Number(result?.[`added${index + 1}`] || 0), 0);
    showResult(t.apply, (added ? t.feedback?.appliedCount : t.feedback?.noChanges)
      ?.replace("{{count}}", String(added)) || t.feedback?.notReady, added ? "success" : "info");
  }
  function restore() {
    const result = onRestoreFlexible?.();
    if (result?.error) {
      showResult(t.restore, t.feedback?.[result.error] || t.feedback?.notReady, "error");
      return;
    }
    setRequested(emptyRequests());
    const restored = Number(result?.restored || 0);
    const kept = Number(result?.kept || 0);
    const template = restored ? t.feedback?.restoredDetails : t.feedback?.restoredNoPlayers;
    showResult(t.restore, (template || t.feedback?.restored || "")
      .replace("{{restored}}", String(restored))
      .replace("{{kept}}", String(kept)), restored ? "success" : "info");
  }

  return <section className="planner-panel planner-flexible-panel">
    <div className="planner-section-heading">
      <div><h3><ArrowLeftRight size={19} aria-hidden="true" />{t.allianceTitle}</h3><p>{t.flexibleDescription}</p></div>
      <span className="planner-count-chip">{t.availableFlexible.replace("{{count}}", String(available))}</span>
    </div>
    <div className="planner-limits-grid">
      {shifts.map((shift) => <NumberSetting key={shift} label={t[`add${shift[0].toUpperCase()}${shift.slice(1)}`]}
        value={requested[shift]} max={available} disabled={disabled}
        onChange={(value) => setRequested((current) => ({ ...current, [shift]: value }))} />)}
    </div>
    <div className="planner-flexible-applied">
      {shifts.map((shift) => <span key={shift}>{t[`applied${shift[0].toUpperCase()}${shift.slice(1)}`]
        .replace("{{count}}", String(allocated.filter((value) => value === shift).length))}</span>)}
    </div>
    {invalid && <p className="planner-warning" role="alert">{t.notEnoughFlexible}</p>}
    <div className="planner-section-actions">
      <button type="button" className="admin-primary-button"
        disabled={disabled || countRequested === 0 || invalid} onClick={apply}>
        <img className="planner-section-actions__icon" src="/images/admin/icons/actions/approve.webp" alt="" aria-hidden="true" />{t.apply}
      </button>
      <button type="button" className="admin-secondary-button"
        disabled={disabled || allocated.length === 0} onClick={restore}>
        <img className="planner-section-actions__icon" src="/images/admin/icons/actions/redistribute-helpers.webp" alt="" aria-hidden="true" />{t.restore}
      </button>
    </div>
    <div className="planner-quota-divider" />
    <label className="planner-switch">
      <input type="checkbox" disabled={disabled} checked={settings.allianceLimits}
        onChange={(event) => update("allianceLimits", event.target.checked)} />
      <span><img className="planner-quota-icon" src="/images/admin/region-editor/alliances.webp" alt="" aria-hidden="true" />{t.manual}</span>
    </label>
    <p>{t.quotaExplanation}</p>
    {settings.allianceLimits && (
      <div className="planner-limits-grid">
        {shifts.map((shift) => <NumberSetting key={shift}
          label={t[`cap${shift[0].toUpperCase()}${shift.slice(1)}`]}
          value={settings[`${shift}Limit`]} max={100} disabled={disabled}
          onChange={(value) => update(`${shift}Limit`, value)} />)}
      </div>
    )}
  </section>;
}

export default FlexibleShiftSettings;
