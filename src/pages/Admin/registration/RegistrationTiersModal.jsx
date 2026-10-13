import { useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import RegistrationModalFooter from "./RegistrationModalFooter.jsx";
import { REGISTRATION_TIERS } from "../../../features/registration/registrationSettings.js";

function RegistrationTiersModal({
  open,
  onClose,
  r,
  settings,
  canEdit,
  saving,
  onSave,
}) {
  const [draft, setDraft] = useState(() => ({
    ...settings.availableTiers,
  }));

  function toggle(tier, checked) {
    setDraft((current) => ({
      ...current,
      [tier]: checked,
    }));
  }

  async function handleSave() {
    await onSave({ availableTiers: draft });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="820px"
      title={r.tiersModal.title}
      subtitle={r.tiersModal.description}
      closeLabel={r.common.close}
      footer={
        <RegistrationModalFooter
          onClose={onClose}
          onSave={handleSave}
          cancelLabel={r.common.cancel}
          saveLabel={r.tiersModal.save}
          savingLabel={r.common.saving}
          saving={saving}
          disabled={!canEdit}
        />
      }
    >
      <div className="registration-modal-section">
        <div className="registration-tier-grid">
          {REGISTRATION_TIERS.map((tier) => (
            <label key={tier} className="registration-tier-option">
              <input
                type="checkbox"
                checked={draft[tier] === true}
                disabled={!canEdit}
                onChange={(event) => toggle(tier, event.target.checked)}
              />
              <span>{tier}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default RegistrationTiersModal;
