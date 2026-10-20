import { useEffect, useMemo, useState } from "react";

import { normalizeRegistrationSettings } from "../../../features/registration/registrationSettings.js";
import { saveAdminRegistrationSettings } from "../services/registrationSettingsApi.js";
import {
  buildRegistrationCandidate,
  createDefaultsConfirmState,
  createRegistrationConfirmState,
  getDisabledShiftConflicts,
  getRegistrationSettingsSummary,
  getRegistrationValidationError,
} from "./registrationSettingsAdmin.js";

export default function useRegistrationSettingsAdmin({
  settings,
  setSettings,
  canEdit,
  players,
}) {
  const [activeModal, setActiveModal] = useState("");
  const [savingSection, setSavingSection] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [toastKey, setToastKey] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [cycleChoice, setCycleChoice] = useState("new");
  const [shiftRemapState, setShiftRemapState] = useState(null);

  useEffect(() => {
    if (!toastKey || toastKey === "closedOnServer" || toastKey === "openedOnServer") {
      return undefined;
    }

    const timer = setTimeout(() => setToastKey(""), 4000);
    return () => clearTimeout(timer);
  }, [toastKey]);

  const summary = useMemo(
    () => getRegistrationSettingsSummary(settings),
    [settings],
  );

  async function performSave(section, candidate, options = {}) {
    if (!canEdit || savingSection) {
      return;
    }

    try {
      setSavingSection(section);
      setErrorKey("");

      const result = await saveAdminRegistrationSettings(candidate, options);
      const prepared = normalizeRegistrationSettings({
        ...candidate,
        ...(result.settings || {}),
      });

      setSettings(prepared);
      setActiveModal("");
      setConfirmState(null);
      setShiftRemapState(null);
      // The Worker has already committed the access toggle in D1.
      // The static public JSON is published asynchronously by GitHub Actions:
      // do not imply that visitors already see the new state.
      const statusChanged = section === "cycleStatus";
      setToastKey(statusChanged
        ? prepared.publicRegistration === false
          ? "closedOnServer"
          : "openedOnServer"
        : options.applyToCurrentCycle
          ? "currentApplied"
          : section === "defaults"
            ? "defaultsRestored"
            : "saved");
    } catch (saveError) {
      console.error(`Save registration section ${section}:`, saveError);
      setErrorKey(String(saveError?.message || "").includes("CYCLE_WINDOW_CLOSED") ? "cycleWindowClosed" : "save");
    } finally {
      setSavingSection("");
    }
  }

  function requestSave(section, patch) {
    const candidate = buildRegistrationCandidate(settings, patch);
    const validationError = getRegistrationValidationError(section, candidate);

    if (validationError) {
      setErrorKey(validationError);
      return;
    }

    setErrorKey("");

    const nextConfirmState = createRegistrationConfirmState({
      section,
      candidate,
      currentCycleOpen: settings.currentPeriodOpen === true,
    });

    if (nextConfirmState) {
      setConfirmState(nextConfirmState);
      return;
    }

    performSave(section, candidate, { applySection: section });
  }

  function applyRulesToCurrentCycle() {
    if (!confirmState || confirmState.kind !== "rules") {
      return;
    }

    if (confirmState.section === "shifts") {
      const conflicts = getDisabledShiftConflicts(
        players,
        confirmState.candidate.availableShifts,
      );

      if (conflicts.length > 0) {
        setShiftRemapState({
          section: confirmState.section,
          candidate: confirmState.candidate,
          conflicts,
        });
        setConfirmState(null);
        return;
      }
    }

    performSave(confirmState.section, confirmState.candidate, {
      applyToCurrentCycle: true,
      applySection: confirmState.section,
    });
  }

  function saveRulesForNextCycle() {
    if (!confirmState || confirmState.kind !== "rules") {
      return;
    }

    performSave(confirmState.section, confirmState.candidate, {
      applyToCurrentCycle: false,
      applySection: confirmState.section,
    });
  }

  function requestRestoreDefaults() {
    setConfirmState(createDefaultsConfirmState(settings));
  }

  function requestToggleRegistration(nextState) {
    const candidate = buildRegistrationCandidate(settings, {
      publicRegistration: nextState,
    });

    setErrorKey("");
    setCycleChoice("new");
    setConfirmState({
      kind: "status",
      section: "cycleStatus",
      candidate,
      closing: nextState === false,
    });
  }

  function saveConfirmedState() {
    if (!confirmState) {
      return;
    }

    if (confirmState.kind === "rules") {
      applyRulesToCurrentCycle();
      return;
    }

    performSave(confirmState.section, confirmState.candidate, {
      applySection: confirmState.section,
      cycleAction: confirmState.kind === "status" && !confirmState.closing
        ? cycleChoice : "",
    });
  }

  function saveShiftRemap(mapping) {
    if (!shiftRemapState) {
      return;
    }

    performSave("shifts", shiftRemapState.candidate, {
      applyToCurrentCycle: true,
      applySection: "shifts",
      shiftMapping: mapping,
    });
  }

  return {
    activeModal,
    setActiveModal,
    savingSection,
    errorKey,
    toastKey,
    dismissToast: () => setToastKey(""),
    confirmState,
    setConfirmState,
    cycleChoice,
    setCycleChoice,
    shiftRemapState,
    setShiftRemapState,
    summary,
    requestSave,
    requestRestoreDefaults,
    requestToggleRegistration,
    saveRulesForNextCycle,
    saveConfirmedState,
    saveShiftRemap,
  };
}
