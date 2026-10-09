import { useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import RegistrationModalFooter from "./RegistrationModalFooter.jsx";
import { REGISTRATION_SHIFTS } from "../../../features/registration/registrationShifts.js";

function RegistrationShiftsModal({
  open,
  onClose,
  r,
  shifts,
  settings,
  canEdit,
  saving,
  onSave,
}) {
  const [draft, setDraft] = useState(() => ({
    ...settings.availableShifts,
  }));

  function toggle(shift, checked) {
    setDraft((current) => ({
      ...current,
      [shift]: checked,
    }));
  }

  async function handleSave() {
    await onSave({ availableShifts: draft });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="760px"
      title={r.shiftsModal.title}
      subtitle={r.shiftsModal.description}
      closeLabel={r.common.close}
      footer={
        <RegistrationModalFooter
          onClose={onClose}
          onSave={handleSave}
          cancelLabel={r.common.cancel}
          saveLabel={r.shiftsModal.save}
          savingLabel={r.common.saving}
          saving={saving}
          disabled={!canEdit}
        />
      }
    >
      <div className="registration-modal-section">
        <div className="registration-choice-grid registration-choice-grid--two">
          {REGISTRATION_SHIFTS.map((shift) => (
            <label key={shift} className="registration-choice-option">
              <input
                type="checkbox"
                checked={draft[shift] === true}
                disabled={!canEdit}
                onChange={(event) => toggle(shift, event.target.checked)}
              />
              <span>{shifts[shift]}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default RegistrationShiftsModal;
