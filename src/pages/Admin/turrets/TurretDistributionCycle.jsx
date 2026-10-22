import { publicAsset } from "../../../utils/publicAsset.js";

import { useCallback, useState } from "react";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal.jsx";
import TurretActionResultModal from "./TurretActionResultModal.jsx";
import TurretWorkspaceStatus from "./TurretWorkspaceStatus.jsx";
import useTurretConfirm from "./useTurretConfirm.js";
import { resolveTurretFeedback } from "../../../features/turrets/turretFeedback.js";
import TurretDistributionNav from "./TurretDistributionNav.jsx";
import TurretSettingsStage from "./TurretSettingsStage.jsx";
import TurretSettings from "./TurretSettings.jsx";
import PlayerStatus from "./PlayerStatus.jsx";
import FinalPlanAdminPreview from "./FinalPlanAdminPreview.jsx";
import useTurretPlan from "./useTurretPlan.js";
import { getPlannerShift } from "../../../features/turrets/plannerPlayers.js";
import { getActivePlannerShifts } from "../../../features/turrets/plannerShifts.js";
import { captureRegionShifts } from "../../../../shared/captureRegions.js";

function TurretDistributionCycle({ t, language, publicT, players, periodId, loading, error, onReload, editable, canPublish, registrationSettings, registrationSettingsReady = false, registrationSettingsError = "", onReloadRegistrationSettings, userId, region = "home" }) {
  const [section, setSection] = useState("settings");
  const [shift, setShift] = useState("shift1");
  const [actionNotice, setActionNotice] = useState(null);
  const { dialog, requestConfirm, closeConfirm, confirm } = useTurretConfirm();
  const activeShifts = region === "home" ? getActivePlannerShifts(registrationSettings?.availableShifts) : captureRegionShifts(registrationSettings, region);
  const displayedShift = activeShifts.includes(shift) ? shift : activeShifts[0];
  const plan = useTurretPlan(periodId, players, editable, userId, !loading && !error && registrationSettingsReady, activeShifts, language, region);
  const a = { distribution: t.distribution, troops: t.players.troops, shifts: t.players.shifts };
  const effectivePlayers = plan.players;
  const loaded = !loading && !error && registrationSettingsReady && plan.ready;
  const flexibleLimitInvalid = plan.settingsDraft.settings.allianceLimits &&
    activeShifts.reduce((sum, key) => sum + Number(plan.settingsDraft.settings[`${key}Extra`] || 0), 0) >
      players.filter((player) => getPlannerShift(player) === "flexible").length;
  const recoveryBlocked = !registrationSettingsReady || plan.assignmentsDraft.stale || plan.busy;
  const redistributeBlocked = recoveryBlocked || flexibleLimitInvalid;
  const autoBlocked = redistributeBlocked || plan.assignmentsDraft.conflicts.length > 0;
  const translatedMessage = resolveTurretFeedback(a.distribution, plan.message, plan.autoStats);
  const diag = a.distribution.publicationDiagnostics;
  const blockedReason = !canPublish ? diag.noPermission : !loaded ? diag.notReady :
    plan.sync.remoteConflict ? diag.remoteConflict : plan.sync.stale ? diag.stale :
      plan.sync.conflicts ? diag.conflicts : plan.sync.rosterChanged ? diag.rosterChanged : "";
  const publicationMessage = plan.lastApiError ? diag.apiError.replace("{{code}}", plan.lastApiError) : "";
  const feedbackIsError = ["conflict", "saveFailed", "publishFailed", "restoreFailed", "stale",
    "periodChanged", "autoBlocked", "manualMode", "rulesConflict",
    "autoRedistributedIssues"].includes(plan.message);
  const dismissNotice = useCallback((id) => setActionNotice((old) => old?.id === id ? null : old), []);
  function notify({ title, text, tone = "success" }) {
    if (!text) return;
    setActionNotice((old) => ({ id: (old?.id || 0) + 1, title, text, tone }));
  }
  function runAuto(options) {
    const stats = plan.auto(options);
    const key = !stats ? "autoBlocked" : options.operation === "redistribute"
      ? stats.remainingConflicts ? "autoRedistributedIssues" : "autoRedistributed"
      : !stats.changed ? "autoNoChange" : options.operation === "tower" ? "autoTowerFilled" : "autoFilled";
    notify({ title: options.operation === "redistribute" ? a.distribution.actions.redistribute
      : options.operation === "tower" ? a.distribution.turret.autofill : a.distribution.actions.fill,
      text: resolveTurretFeedback(a.distribution, key, stats || null),
      tone: !stats || stats.remainingConflicts ? "error" : stats.changed ? "success" : "info" });
    return stats;
  }
  function runClearHelpers() {
    const stats = plan.clearHelpers();
    const key = !stats ? "autoBlocked" : stats.released ? "helpersCleared" : "helpersAlreadyEmpty";
    notify({ title: a.distribution.actions.clearHelpers,
      text: resolveTurretFeedback(a.distribution, key, stats ? { helpersReleased: stats.released } : null),
      tone: !stats ? "error" : stats.released ? "success" : "info" });
    return stats;
  }

  return (
    <>
      <div className="admin-section__head turret-distribution-heading">
        <div className="turret-distribution-heading__title">
          <h2>{a.distribution.title}</h2>
          <p>{a.distribution.description}</p>
        </div>
        <TurretWorkspaceStatus sync={plan.sync} t={a.distribution.workspace} requestConfirm={requestConfirm}
          confirmTitle={a.distribution.confirm?.reloadTitle || a.distribution.title} />
      </div>
      {registrationSettingsError && <div className="turret-draft-feedback turret-draft-feedback--error" role="alert">
        {registrationSettingsError}
        <button type="button" className="admin-secondary-button"
          onClick={() => onReloadRegistrationSettings?.().catch(() => {})}>
          {a.distribution.planner.retrySettings}
        </button>
      </div>}
      <TurretDistributionNav labels={a.distribution.subtabs} active={section}
        onChange={setSection} ariaLabel={a.distribution.title} />
      {translatedMessage && <p className={`turret-draft-feedback${feedbackIsError ? " turret-draft-feedback--error" : ""}`} role="status">
        {translatedMessage}
      </p>}
      {plan.lastApiError && <p className="turret-draft-feedback turret-draft-feedback--error" role="alert">
        {publicationMessage}
      </p>}
      <TurretSettingsStage hidden={section !== "settings"} draft={plan.settingsDraft}
        assignments={plan.assignmentsDraft.assignments} a={a} registrationSettings={registrationSettings}
        players={effectivePlayers} registrations={players} periodId={periodId} loaded={loaded} loading={loading || plan.loading || !registrationSettingsReady}
        error={error} onReload={onReload} editable={editable && !plan.busy && registrationSettingsReady}
        onAuto={runAuto} onClearHelpers={runClearHelpers}
        onActionFeedback={notify}
        autoBlocked={autoBlocked} redistributeBlocked={redistributeBlocked}
        clearHelpersBlocked={recoveryBlocked} requestConfirm={requestConfirm} />
      {section === "turrets" && <TurretSettings a={a} language={language} shift={displayedShift} setShift={setShift}
        draft={plan.assignmentsDraft} players={effectivePlayers} settings={plan.settingsDraft.settings}
        activeShifts={activeShifts} availableTiers={registrationSettings?.availableTiers}
        periodId={periodId} loaded={loaded} editable={editable && !plan.busy && registrationSettingsReady}
        onAuto={runAuto} autoBlocked={autoBlocked} requestConfirm={requestConfirm} />}
      {section === "players" && <PlayerStatus a={a} language={language} players={effectivePlayers}
        assignments={plan.assignmentsDraft.assignments} editable={editable && !plan.busy && registrationSettingsReady}
        loaded={loaded} apply={plan.assignmentsDraft.apply} activeShifts={activeShifts} />}
      {section === "final" && <FinalPlanAdminPreview a={a} language={language} publicT={publicT}
        assignments={plan.assignmentsDraft.assignments} players={effectivePlayers}
        activeShifts={activeShifts} settings={plan.settingsDraft.settings} loaded={loaded} busy={plan.busy}
        blocked={plan.sync.remoteConflict || plan.sync.rosterChanged || plan.sync.blocked} conflicts={plan.assignmentsDraft.conflicts}
        canPublish={canPublish} published={plan.published}
        onPublish={plan.publish} onRestore={plan.restore} requestConfirm={requestConfirm}
        blockedReason={blockedReason} onLanguagesChange={(codes) =>
          plan.settingsDraft.setSettings((current) => ({ ...current, planLanguages: codes }))} />}
      <TurretActionResultModal notice={actionNotice} onDismiss={dismissNotice}
        labels={a.distribution.limits.feedback} />
      <ConfirmModal open={Boolean(dialog)} className="turret-confirm-modal" title={dialog?.title || a.distribution.title}
        message={dialog?.message || ""} tone={dialog?.tone || "warning"}
        iconSrc={dialog?.tone === "danger"
          ? publicAsset("/images/admin/icons/actions/delete.webp")
          : dialog?.tone === "info" ? undefined : publicAsset("/images/registration-settings/warning-icon.webp")}
        confirmLabel={a.distribution.confirm?.accept || a.distribution.actions.publish}
        cancelLabel={a.distribution.confirm?.cancel || a.distribution.actions.clear}
        onConfirm={confirm} onCancel={closeConfirm} />
    </>
  );
}
export default TurretDistributionCycle;
