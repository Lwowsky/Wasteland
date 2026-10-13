import { publicAsset } from "../../../utils/publicAsset.js";

import { lazy, Suspense } from "react";

import { getRegistrationConfirmContent } from "./registrationSettingsAdmin.js";
import "./RegistrationAdminModal.css";

const CONFIRM_WARNING_ICON = publicAsset("/images/registration-settings/warning-icon.webp");

const RegistrationConfirmModal = lazy(() =>
  import("./RegistrationConfirmModal.jsx"),
);
const RegistrationCycleModal = lazy(() => import("./RegistrationCycleModal.jsx"));
const RegistrationFormFieldsModal = lazy(() =>
  import("./RegistrationFormFieldsModal.jsx"),
);
const RegistrationShiftRemapModal = lazy(() =>
  import("./RegistrationShiftRemapModal.jsx"),
);
const RegistrationShiftsModal = lazy(() => import("./RegistrationShiftsModal.jsx"));
const RegistrationTiersModal = lazy(() => import("./RegistrationTiersModal.jsx"));
const RegistrationWastelandModal = lazy(() =>
  import("./RegistrationWastelandModal.jsx"),
);

export default function RegistrationSettingsModals({
  r,
  shifts,
  language,
  settings,
  canEdit,
  controller,
}) {
  const {
    activeModal,
    setActiveModal,
    savingSection,
    confirmState,
    setConfirmState,
    shiftRemapState,
    setShiftRemapState,
    requestSave,
    saveRulesForNextCycle,
    saveConfirmedState,
    saveShiftRemap,
  } = controller;

  const confirmContent = getRegistrationConfirmContent(confirmState, r);

  return (
    <Suspense fallback={null}>
      {activeModal === "cycle" && (
        <RegistrationCycleModal
          open
          onClose={() => setActiveModal("")}
          r={r}
          language={language}
          settings={settings}
          canEdit={canEdit}
          saving={savingSection === "cycle"}
          onSave={(patch) => requestSave("cycle", patch)}
        />
      )}

      {activeModal === "shifts" && (
        <RegistrationShiftsModal
          open
          onClose={() => setActiveModal("")}
          r={r}
          shifts={shifts}
          settings={settings}
          canEdit={canEdit}
          saving={savingSection === "shifts"}
          onSave={(patch) => requestSave("shifts", patch)}
        />
      )}

      {activeModal === "tiers" && (
        <RegistrationTiersModal
          open
          onClose={() => setActiveModal("")}
          r={r}
          settings={settings}
          canEdit={canEdit}
          saving={savingSection === "tiers"}
          onSave={(patch) => requestSave("tiers", patch)}
        />
      )}

      {activeModal === "wasteland" && (
        <RegistrationWastelandModal
          open
          onClose={() => setActiveModal("")}
          r={r}
          settings={settings}
          canEdit={canEdit}
          saving={savingSection === "wasteland"}
          onSave={(patch) => requestSave("wasteland", patch)}
        />
      )}

      {activeModal === "formFields" && (
        <RegistrationFormFieldsModal
          open
          onClose={() => setActiveModal("")}
          r={r}
          settings={settings}
          canEdit={canEdit}
          saving={savingSection === "formFields"}
          onSave={(patch) => requestSave("formFields", patch)}
        />
      )}

      {confirmState && confirmContent && (
        <RegistrationConfirmModal
          open
          onClose={() => setConfirmState(null)}
          title={confirmContent.title}
          description={confirmContent.description}
          details={confirmContent.details}
          cancelLabel={r.common.cancel}
          secondaryLabel={confirmContent.secondaryLabel}
          onSecondary={
            confirmState.kind === "rules" ? saveRulesForNextCycle : undefined
          }
          primaryLabel={confirmContent.primaryLabel}
          onPrimary={saveConfirmedState}
          busy={Boolean(savingSection)}
          iconSrc={CONFIRM_WARNING_ICON}
        />
      )}

      {shiftRemapState && (
        <RegistrationShiftRemapModal
          open
          onClose={() => setShiftRemapState(null)}
          r={r}
          shifts={shifts}
          conflicts={shiftRemapState.conflicts || []}
          enabledShifts={shiftRemapState.candidate?.availableShifts || {}}
          saving={savingSection === "shifts"}
          onSave={saveShiftRemap}
        />
      )}
    </Suspense>
  );
}
