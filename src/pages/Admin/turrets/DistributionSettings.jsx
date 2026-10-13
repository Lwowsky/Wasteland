import DistributionSummary from "./DistributionSummary.jsx";
import DistributionLimits from "./DistributionLimits.jsx";

import "./DistributionSettings.css";

function DistributionSettings({
  a, stats, settings, setSettings, loaded, loading, error, ready,
  onAuto, onClearHelpers, autoBlocked, redistributeBlocked, clearHelpersBlocked,
  editable, assignments, players, registrations,
  registrationSettings, onApplyFlexible, onRestoreFlexible, onActionFeedback, requestConfirm,
}) {
  const p = a.distribution.planner;
  const autoT = a.distribution.auto;
  const controlsDisabled = !editable || !ready || !loaded || Boolean(error);
  const automationDisabled = controlsDisabled || Boolean(autoBlocked) || settings.mode === "manual";
  const redistributionDisabled = controlsDisabled || Boolean(redistributeBlocked) || settings.mode === "manual";
  const clearDisabled = controlsDisabled || Boolean(clearHelpersBlocked);
  return (
    <div className="planner-settings-view">
      {error && <p className="planner-source-error" role="alert">{p.loadFailed}</p>}
      <DistributionSummary a={a} players={players} assignments={assignments}
        registrationSettings={registrationSettings} loaded={loaded && !loading && !error} />
      {loaded && stats.unknown > 0 && (
        <p className="planner-unsaved">{p.otherShiftNotice
          .replace("{{count}}", String(stats.unknown))}</p>
      )}
      {!editable && <p className="planner-source-error">{p.readonly}</p>}
      <section className="planner-auto-panel" aria-label={autoT.title}>
        <div>
          <strong><img className="planner-auto-panel__icon" src="/images/admin/icons/turret-distribution.webp" alt="" aria-hidden="true" />{autoT.title}</strong>
          <p>{autoT.shortDescription}</p>
          {settings.mode === "manual" && <small>{autoT.manualDisabled}</small>}
        </div>
        <div className="planner-auto-panel__actions">
          <button type="button" className="admin-secondary-button" disabled={redistributionDisabled}
            onClick={() => {
              requestConfirm?.({
                title: a.distribution.confirm?.redistributeTitle || autoT.title,
                message: autoT.confirmRedistribute,
                onConfirm: () => onAuto?.({ operation: "redistribute" }),
              });
            }}><img className="planner-auto-panel__action-icon" src="/images/admin/icons/actions/redistribute-helpers.webp" alt="" aria-hidden="true" />{a.distribution.actions.redistribute}</button>
          <button type="button" className="admin-primary-button" disabled={automationDisabled}
            onClick={() => onAuto?.({ operation: "fill" })}>
            <img className="planner-auto-panel__action-icon" src="/images/admin/icons/actions/fill-turrets.webp" alt="" aria-hidden="true" />{a.distribution.actions.fill}
          </button>
          <button type="button" className="admin-secondary-button planner-auto-panel__clear" disabled={clearDisabled}
            onClick={() => requestConfirm?.({
              title: a.distribution.confirm?.clearHelpersTitle,
              message: autoT.confirmClearHelpers,
              tone: "danger",
              onConfirm: () => onClearHelpers?.(),
            })}>
            <img className="planner-auto-panel__delete-icon" src="/images/admin/icons/actions/delete.webp" alt="" aria-hidden="true" />{a.distribution.actions.clearHelpers}
          </button>
        </div>
      </section>
      <DistributionLimits a={a} settings={settings} setSettings={setSettings}
        disabled={controlsDisabled} assignments={assignments} players={players}
        registrations={registrations} registrationSettings={registrationSettings}
        onApplyFlexible={onApplyFlexible} onRestoreFlexible={onRestoreFlexible}
        onActionFeedback={onActionFeedback} />
    </div>
  );
}

export default DistributionSettings;
