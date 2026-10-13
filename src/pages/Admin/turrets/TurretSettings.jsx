import { publicAsset } from "../../../utils/publicAsset.js";

import { formatMarch } from "../../../utils/formatMarch.js";
import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import TroopBadge from "../../../components/PlayerBadges/TroopBadge.jsx";
import { TURRET_ICON_URLS } from "../../../features/turrets/plannerConstants.js";
import {
  addHelper, changeCaptain, clearTurret, getTurretMetrics,
} from "../../../features/turrets/turretAssignments.js";
import TurretList from "./TurretList.jsx";
import TurretCaptainEditor from "./TurretCaptainEditor.jsx";
import TurretHelperEditor from "./TurretHelperEditor.jsx";
import TurretManualAdd from "./TurretManualAdd.jsx";
import TurretTowerLimits from "./TurretTowerLimits.jsx";
import TurretPlayerEditModal from "./TurretPlayerEditModal.jsx";
import { getTowerMaxHelpers, getTowerRule, updateTowerRule } from "../../../features/turrets/turretSlotRules.js";
import { addManualTurretPlayer, moveTurretPlanPlayer, removeTurretPlanPlayer } from "../../../features/turrets/turretManualActions.js";
import "./TurretTowerEditor.css";
import "./TurretAssignmentsStage.css";


function TurretSettings({ a, language, shift, setShift, draft, players, settings, activeShifts = ["shift1", "shift2"], loaded, editable, periodId, onAuto, autoBlocked, requestConfirm, availableTiers }) {
  const [selectedId, setSelectedId] = useState("hub");
  const [localMessage, setLocalMessage] = useState("");
  const [localError, setLocalError] = useState(false);
  const [editId, setEditId] = useState(null);
  const p = a.distribution.manual;
  const disabled = !loaded || !editable || !periodId;
  const autoDisabled = disabled || autoBlocked || settings.mode === "manual";
  const slot = draft.assignments.shifts[shift][selectedId];
  const captain = players.find((player) => String(player.id) === slot.captainId);
  const metrics = getTurretMetrics(slot, players, settings);
  const rule = getTowerRule(draft.assignments, shift, selectedId);

  function apply(action) {
    const result = action(draft.assignments);
    if (result.error) {
      setLocalMessage(p.errors[result.error] || p.errors.unavailable);
      setLocalError(true);
      return false;
    }
    setLocalMessage("");
    setLocalError(false);
    return draft.apply(() => result);
  }
  function changeSelectedCaptain(id) {
    return apply((assignments) => changeCaptain(assignments, shift, selectedId, id, players, settings));
  }
  function addSelectedHelper(id) {
    return apply((assignments) => addHelper(assignments, shift, selectedId, id, players, settings));
  }
  function createPlayer(fields) {
    const id = `m_${crypto.randomUUID().replaceAll("-", "")}`;
    return apply((assignments) => addManualTurretPlayer(assignments, players, settings, {
      id, shift, tower: selectedId, role: fields.role, fields,
    }));
  }
  function savePlayer(values, destination) {
    const success = apply((assignments) => moveTurretPlanPlayer(assignments, players, settings, editId, values, destination));
    if (success) setEditId(null);
    return success;
  }
  function deletePlanPlayer() {
    const success = apply((assignments) => removeTurretPlanPlayer(assignments, editId));
    if (success) setEditId(null);
    return success;
  }
  function updateOption(key, value) {
    return apply((assignments) => updateTowerRule(assignments, shift, selectedId,
      { flags: { [key]: value } }));
  }
  function showSuccess(message) {
    setLocalMessage(message);
    setLocalError(false);
  }
  function clearSelected() {
    requestConfirm?.({
      title: a.distribution.confirm?.clearTitle || a.distribution.turret.clear,
      message: p.confirmClear.replace("{{tower}}", a.distribution.towers[selectedId]),
      onConfirm: () => apply((assignments) => clearTurret(assignments, shift, selectedId)),
      tone: "danger",
    });
  }
  return (
    <div className="turret-layout-view">
      <div className="turret-shift-switch" role="group" aria-label={a.distribution.turret.shifts}>
        {activeShifts.map((id) => (
          <button key={id} type="button" className={shift === id ? "admin-primary-button" : "admin-secondary-button"}
            aria-pressed={shift === id} onClick={() => { setShift(id); setLocalMessage(""); }}>
            {a.shifts[id]}
          </button>
        ))}
      </div>
      {draft.stale && (
        <div className="turret-draft-feedback turret-draft-feedback--warn">
          <span>{p.staleNotice}</span>
          <button type="button" className="admin-secondary-button" disabled={disabled}
            onClick={() => requestConfirm?.({
              title: a.distribution.confirm?.reconcileTitle || p.reconcile,
              message: p.confirmReconcile,
              onConfirm: () => draft.reconcile(),
            })}>
            {p.reconcile}
          </button>
        </div>
      )}
      {draft.conflicts.length > 0 && (
        <div className="turret-draft-feedback turret-draft-feedback--error" role="alert">
          {p.rulesConflict.replace("{{count}}", String(draft.conflicts.length))}
        </div>
      )}
      {(p.messages[draft.message] || p.errors[draft.message]) &&
        <div role="status" className="turret-draft-feedback">
          {p.messages[draft.message] || p.errors[draft.message]}
        </div>}
      {localMessage && <div role="status" className={`turret-draft-feedback${localError ? " turret-draft-feedback--error" : ""}`}>{localMessage}</div>}
      {!loaded && <div role="note" className="turret-draft-feedback turret-draft-feedback--warn">{p.waitForPlayers}</div>}
      {!editable && <div role="note" className="turret-draft-feedback turret-draft-feedback--warn">{a.distribution.planner.readonly}</div>}
      <div className="turret-layout-grid">
        <TurretList a={a} shift={shift} assignments={draft.assignments} players={players}
          selected={selectedId} onSelect={(id) => { setSelectedId(id); setLocalMessage(""); }} />
        <section className="turret-detail-card">
          <div className="turret-detail-head">
            <div>
              <span className="turret-list-card__icon turret-detail-head__icon">
                <img src={TURRET_ICON_URLS[selectedId]} alt="" aria-hidden="true" />
              </span>
              <h3>{a.distribution.towers[selectedId]}</h3>
            </div>
            {captain?.troopType ? (
              <TroopBadge type={captain.troopType} label={a.troops[captain.troopType] || captain.troopType} compact />
            ) : (
              <span className="admin-badge admin-badge--blue">{a.distribution.turret.typeByCaptain}</span>
            )}
          </div>
          <div className="turret-detail-options" aria-label={a.distribution.turret.settingsAndLimits}>
            {(["onlyCaptains", "respectShift", "sameTroopType", "allowFlexible"]).map((key) => (
              <label key={key}><input type="checkbox" disabled={disabled}
                checked={typeof rule.flags?.[key] === "boolean" ? rule.flags[key] : Boolean(settings[key])}
                onChange={(event) => updateOption(key, event.target.checked)} />
                {a.distribution.refill[key]}</label>
            ))}
          </div>
          <div className="turret-captain-toolbar">
            <TurretCaptainEditor key={`${shift}:${selectedId}:${slot.captainId || ""}`} a={a} shift={shift} tower={selectedId} assignments={draft.assignments}
              players={players} settings={settings} disabled={disabled} onSetCaptain={changeSelectedCaptain} />
            <button type="button" className="admin-secondary-button turret-toolbar-action" disabled={autoDisabled}
              title={settings.mode === "manual" ? a.distribution.auto.manualDisabled : undefined}
              onClick={() => onAuto?.({ operation: "tower", shift, tower: selectedId })}>
              <img src={publicAsset("/images/admin/icons/actions/fill-turrets.webp")} alt="" aria-hidden="true" />
              {a.distribution.turret.autofill}
            </button>
            <button type="button" className="admin-secondary-button turret-toolbar-action turret-toolbar-action--danger"
              disabled={disabled || (!slot.captainId && !slot.helperIds.length)} onClick={clearSelected}>
              <img src={publicAsset("/images/admin/icons/actions/delete.webp")} alt="" aria-hidden="true" />
              {a.distribution.turret.clear}
            </button>
          </div>
          <div className="turret-metrics">
            {([
              ["captainMarch", metrics.captainMarch], ["rally", metrics.rallySize],
              ["total", metrics.capacity], ["free", metrics.free],
            ]).map(([key, value]) => <article key={key}>
              <span>{a.distribution.turret[key]}</span><strong>{formatMarch(value, language)}</strong>
            </article>)}
          </div>
          <TurretTowerLimits key={`${shift}:${selectedId}`} a={a}
            assignments={draft.assignments} shift={shift} tower={selectedId}
            players={players} settings={settings} availableTiers={availableTiers}
            disabled={disabled} onApply={apply} onFeedback={showSuccess} />
          <div className="turret-action-strip">
            <span><CheckCircle2 size={17} aria-hidden="true" />{a.distribution.towerEditor.helpersUsed
              .replace("{{count}}", String(slot.helperIds.length))
              .replace("{{max}}", String(getTowerMaxHelpers(draft.assignments, shift, selectedId, settings)))}</span>
          </div>
          <TurretManualAdd key={`manual:${shift}:${selectedId}`} a={a} language={language}
            shift={shift} tower={selectedId} assignments={draft.assignments}
            players={players} settings={settings} disabled={disabled}
            availableTiers={availableTiers} onAdd={addSelectedHelper} onCreate={createPlayer} />
          <TurretHelperEditor a={a} language={language} shift={shift} tower={selectedId}
            assignments={draft.assignments} players={players} disabled={disabled}
            onEdit={setEditId} />
          <div className="turret-capacity-notice">
            <AlertTriangle size={16} aria-hidden="true" />{p.capacityNote}
          </div>
        </section>
      </div>
      {editId && players.some((player) => String(player.id) === editId) &&
        <TurretPlayerEditModal key={editId} a={a}
          player={players.find((player) => String(player.id) === editId)} shift={shift}
          tower={selectedId} activeShifts={activeShifts}
          role={slot.captainId === editId ? "captain" : "helper"}
          availableTiers={availableTiers} onClose={() => setEditId(null)}
          onSave={savePlayer} onRelease={deletePlanPlayer} />}
    </div>
  );
}
export default TurretSettings;
