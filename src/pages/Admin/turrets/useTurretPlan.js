import { useEffect, useMemo, useState } from "react";
import { filterCaptureRegionRegistrations, hasOptedIntoRegionCapture, selectCapturePlanRegistrations } from "../../../../shared/captureRegions.js";
import { runAutomaticDistribution } from "../../../features/turrets/autoDistribution.js";
import { releaseAllTurretHelpers } from "../../../features/turrets/turretRedistribution.js";
import { createEmptyAssignments, completeAssignmentShifts, findAssignmentConflicts, normalizeAssignments } from "../../../features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../../../features/turrets/plannerSettings.js";
import { getPlannerShift } from "../../../features/turrets/plannerPlayers.js";
import { composePlanPlayers } from "../../../features/turrets/turretPlanPlayers.js";
import { saveChangedTurretPlan } from "../../../features/turrets/planSync.js";
import {
  getTurretRosterFingerprint, isTurretPlanDirty, readTurretWorkspace,
  removeTurretWorkspace, resolveTurretWorkspace,
} from "../../../features/turrets/localTurretWorkspace.js";
import {
  addPlannerFlexibleShifts, applyPlannerShiftOverrides, restorePlannerFlexibleShifts,
} from "../../../features/turrets/plannerShiftOverrides.js";
import {
  getAdminTurretPlan, publishAdminTurretPlan, restoreAdminPublishedPlan, saveAdminTurretDraft,
} from "../services/turretPlanApi.js";
import useTurretLocalPersistence from "./useTurretLocalPersistence.js";
import { canReviewTurretRoster } from "../../../features/turrets/turretRosterReview.js";
import { initialTurretPlanSettings, emptyTurretPlanSnapshot, serverTurretPlanSnapshot } from "./turretPlanSnapshot.js";

const initialAssignments = () => createEmptyAssignments();

/** One working plan for all four tabs; editing is local until explicit sync or publication. */
export default function useTurretPlan(periodId, registrations, editable = false, userId = "", registrationsReady = false, activeShifts = ["shift1", "shift2"], locale = "uk", region = "home") {
  const workspaceUserId = region === "home" ? userId : `${userId}@${region}`;
  const [settings, setSettings] = useState(() => initialTurretPlanSettings(locale));
  const [raw, setRaw] = useState(initialAssignments);
  const [committed, setCommitted] = useState(() => emptyTurretPlanSnapshot(locale));
  const [revision, setRevision] = useState(0);
  const [published, setPublished] = useState(null);
  const [loading, setLoading] = useState(Boolean(periodId));
  const [loadError, setLoadError] = useState(false);
  const [loadedPeriodId, setLoadedPeriodId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lastApiError, setLastApiError] = useState("");
  const [autoStats, setAutoStats] = useState(null);
  const [remoteConflict, setRemoteConflict] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const rosterFingerprint = useMemo(() => getTurretRosterFingerprint(registrations), [registrations]);
  const eligibleRegistrations = useMemo(() => filterCaptureRegionRegistrations(registrations, region),
    [registrations, region]);
  const plannerRegistrations = useMemo(() => selectCapturePlanRegistrations(registrations, region, raw),
    [registrations, region, raw]);

  const players = useMemo(() => composePlanPlayers(
    applyPlannerShiftOverrides(plannerRegistrations, settings.shiftOverrides), raw),
  [plannerRegistrations, settings.shiftOverrides, raw]);
  // Keep non-opted but manually assigned incumbents in the metrics/roster.
  // They are not eligible for any new automatic placement in captured regions.
  const autoPlayers = useMemo(() => region === "home" ? players : players.map((player) => ({
    ...player, captureAutoExcluded: !hasOptedIntoRegionCapture(player),
  })), [players, region]);
  const assignments = useMemo(() => normalizeAssignments(raw, players), [raw, players]);
  const stale = useMemo(() => JSON.stringify(raw) !== JSON.stringify(assignments), [raw, assignments]);
  const conflicts = useMemo(() => findAssignmentConflicts(assignments, players, settings),
    [assignments, players, settings]);
  const ready = Boolean(periodId) && Number(periodId) === loadedPeriodId && !loading && !loadError;
  const local = useTurretLocalPersistence({ periodId, userId: workspaceUserId, settings, raw, committed,
    revision, fingerprint, ready, editable });
  const dirty = useMemo(() => isTurretPlanDirty(settings, assignments, committed) || stale,
    [settings, assignments, committed, stale]);
  const rosterChanged = ready && registrationsReady && Boolean(fingerprint) && fingerprint !== rosterFingerprint;
  const blocked = stale || conflicts.length > 0 || rosterChanged || remoteConflict;

  function loadResponse(response, { allowLocal = false } = {}) {
    if (Number(response.periodId) !== Number(periodId)) throw new Error("TURRET_PERIOD_CHANGED");
    const snapshot = serverTurretPlanSnapshot(response.draft, locale);
    const nextRevision = response.draft?.revision || 0;
    const stored = allowLocal && editable ? readTurretWorkspace(periodId, workspaceUserId) : null;
    const chosen = resolveTurretWorkspace(snapshot, nextRevision, stored);
    setSettings(normalizePlannerSettings(chosen.snapshot.settings));
    setRaw(completeAssignmentShifts(chosen.snapshot.assignments));
    setCommitted(snapshot);
    setRevision(nextRevision);
    setPublished(response.published || null);
    setRemoteConflict(chosen.conflict);
    setLastApiError("");
    setFingerprint(chosen.restored ? stored?.rosterFingerprint || "" :
      registrationsReady ? rosterFingerprint : "");
    setMessage(chosen.conflict ? "conflict" : chosen.restored ? "localRestored" : "");
    setAutoStats(null);
    setLoadedPeriodId(Number(periodId));
    setLoadError(false);
  }

  useEffect(() => {
    if (!periodId) return undefined;
    let cancelled = false;
    getAdminTurretPlan(region).then((response) => {
      if (!cancelled) loadResponse(response, { allowLocal: true });
    }).catch((error) => {
      if (!cancelled) {
        setLoadError(true);
        setMessage(error.message === "TURRET_PERIOD_CHANGED" ? "periodChanged" : "loadFailed");
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // Period is keyed by the parent component. The first fetch must not be restarted on every edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId, workspaceUserId, region]);

  useEffect(() => {
    if (!ready || !registrationsReady || fingerprint) return;
    let active = true;
    queueMicrotask(() => { if (active) setFingerprint(rosterFingerprint); });
    return () => { active = false; };
  }, [ready, registrationsReady, fingerprint, rosterFingerprint]);

  function changeSettings(update) {
    setSettings((current) => normalizePlannerSettings(typeof update === "function" ? update(current) : update));
    setMessage(""); setLastApiError(""); setAutoStats(null);
  }
  function apply(action) {
    const result = action(assignments);
    if (result.error) { setMessage(result.error); return false; }
    if (result.assignments) { setRaw(result.assignments); setMessage(""); setAutoStats(null); }
    return true;
  }
  function applyFlexible(...counts) {
    if (!ready || busy) return { error: "notReady" };
    const result = addPlannerFlexibleShifts(eligibleRegistrations, settings, assignments, ...counts);
    if (!result.error && (result.added1 || result.added2 || result.added3 || result.added4)) {
      changeSettings((current) => ({ ...current, shiftOverrides: result.shiftOverrides }));
    }
    return result;
  }
  function restoreFlexible() {
    if (!ready || busy) return { error: "notReady" };
    const result = restorePlannerFlexibleShifts(settings, assignments);
    if (!result.error) changeSettings((current) => ({ ...current, shiftOverrides: result.shiftOverrides }));
    return result;
  }
  function auto(options) {
    if (!ready || busy) { setMessage("autoBlocked"); return false; }
    if (stale) { setMessage("stale"); return false; }
    // Redistributing first removes all helpers. It is a recovery action for
    // invalid helper assignments; remaining captain conflicts still block D1.
    if (conflicts.length && options.operation !== "redistribute") {
      setMessage("rulesConflict"); return false;
    }
    if (settings.allianceLimits && activeShifts.reduce((sum, shift) => sum + Number(settings[`${shift}Extra`] || 0), 0) >
      eligibleRegistrations.filter((row) => getPlannerShift(row) === "flexible").length) {
      setMessage("autoBlocked"); return false;
    }
    const outcome = runAutomaticDistribution({ assignments, players: autoPlayers, settings, activeShifts, ...options });
    if (outcome.error) { setMessage(outcome.error === "manualMode" ? "manualMode" : "autoBlocked"); return false; }
    const remainingConflicts = options.operation === "redistribute"
      ? findAssignmentConflicts(outcome.assignments, players, settings).length : 0;
    const stats = { ...outcome.stats, remainingConflicts };
    setAutoStats(stats);
    if (outcome.stats.changed) setRaw(outcome.assignments);
    // Even when deterministic candidates return to the SAME turret, a full
    // redistribution has actually cleared and rebuilt every helper seat.
    setMessage(options.operation === "redistribute"
      ? remainingConflicts ? "autoRedistributedIssues" : "autoRedistributed"
      : !outcome.stats.changed ? "autoNoChange"
        : options.operation === "tower" ? "autoTowerFilled" : "autoFilled");
    return stats;
  }
  function clearHelpers() {
    if (!ready || busy || stale) {
      setMessage(stale ? "stale" : "autoBlocked");
      return false;
    }
    const result = releaseAllTurretHelpers(assignments);
    if (result.error) { setMessage("autoBlocked"); return false; }
    setAutoStats({ helpersReleased: result.released });
    if (result.released) setRaw(result.assignments);
    setMessage(result.released ? "helpersCleared" : "helpersAlreadyEmpty");
    return { released: result.released };
  }
  function reconcile() { setRaw(assignments); setMessage("reconciled"); setAutoStats(null); }
  function acknowledgeRoster() {
    if (!canReviewTurretRoster({ ready, rosterChanged, stale, conflicts: conflicts.length, remoteConflict, busy })) return false;
    setFingerprint(rosterFingerprint);
    setLastApiError("");
    setMessage("rosterAcknowledged");
    return true;
  }

  async function putSharedDraft() {
    const result = await saveChangedTurretPlan({ periodId, revision, settings, assignments, committed },
      (payload) => saveAdminTurretDraft(payload, region));
    if (result.draft) {
      setCommitted({ settings: normalizePlannerSettings(result.draft.settings),
        assignments: result.draft.assignments });
      setRevision(result.revision);
    }
    return result.revision;
  }
  function explainFailure(error, defaultCode) {
    setLastApiError(String(error?.message || defaultCode));
    if (error.message === "TURRET_DRAFT_CONFLICT") {
      setRemoteConflict(true); setMessage("conflict");
    } else setMessage(error.message === "TURRET_PERIOD_CHANGED" ? "periodChanged" :
      error.message === "TURRET_PLAN_EMPTY" ? "empty" : defaultCode);
  }
  async function saveShared() {
    if (!editable || !ready || busy || blocked || !registrationsReady) return false;
    setBusy(true);
    try {
      setLastApiError("");
      await putSharedDraft();
      setMessage("sharedSaved"); return true;
    } catch (error) { explainFailure(error, "saveFailed"); return false; }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!editable || !ready || busy || blocked || !registrationsReady) return false;
    setBusy(true);
    try {
      setLastApiError("");
      // One PUT only if the local copy differs, followed by a distinct POST.
      const sourceRevision = await putSharedDraft();
      const response = await publishAdminTurretPlan({ periodId: Number(periodId), revision: sourceRevision }, region);
      setPublished(response.published);
      setMessage("published"); return true;
    } catch (error) { explainFailure(error, "publishFailed"); return false; }
    finally { setBusy(false); }
  }
  async function restore() {
    if (!ready || busy || !published) return false;
    setBusy(true);
    try {
      const response = await restoreAdminPublishedPlan({ periodId: Number(periodId), revision }, region);
      const snapshot = { settings: normalizePlannerSettings(response.draft.settings),
        assignments: completeAssignmentShifts(response.draft.assignments) };
      setSettings(snapshot.settings); setRaw(snapshot.assignments);
      setCommitted(snapshot); setRevision(response.draft.revision);
      setFingerprint(rosterFingerprint); setRemoteConflict(false);
      setMessage("restored"); setAutoStats(null); return true;
    } catch (error) { explainFailure(error, "restoreFailed"); return false; }
    finally { setBusy(false); }
  }
  async function reloadShared() {
    if (!ready || busy) return false;
    setBusy(true);
    try {
      const response = await getAdminTurretPlan(region);
      // Clearing the old browser copy is deliberate, never part of an automatic refresh.
      if (Number(response.periodId) !== Number(periodId)) throw new Error("TURRET_PERIOD_CHANGED");
      removeTurretWorkspace(periodId, workspaceUserId);
      loadResponse(response);
      setMessage("sharedLoaded"); return true;
    } catch (error) { explainFailure(error, "loadFailed"); return false; }
    finally { setBusy(false); }
  }

  return {
    ready, loading, loadError, busy, message, lastApiError, published, revision, publish, restore, dirty,
    auto, clearHelpers, autoStats, players, localStorageError: local.storageError,
    sync: { dirty, busy, blocked: !registrationsReady || stale || conflicts.length > 0, remoteConflict, rosterChanged,
      localStorageError: local.storageError, editable: ready && editable,
      stale, conflicts: conflicts.length,
      canReviewRoster: canReviewTurretRoster({ ready, rosterChanged, stale, conflicts: conflicts.length, remoteConflict, busy }),
      saveShared, reloadShared, acknowledgeRoster },
    settingsDraft: { settings, setSettings: changeSettings, applyFlexible, restoreFlexible,
      ready: ready && !busy, message, busy },
    assignmentsDraft: { assignments, apply, reconcile, message, conflicts, stale, busy },
  };
}
