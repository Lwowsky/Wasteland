import { useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import { getUserTimeZone } from "../../../utils/date.js";
import { getRegistrationCycleSchedule } from "../../../features/registration/registrationCycle.js";
import RegistrationCycleFields from "./RegistrationCycleFields.jsx";
import RegistrationCyclePreview from "./RegistrationCyclePreview.jsx";
import {
  createRegistrationCycleDraft,
  createRegistrationCycleSavePatch,
  getDefaultRegistrationCycleDraft,
} from "./registrationCycleDraft.js";
import "./RegistrationAdminModal.css";
import "./RegistrationCycleModal.css";

function RegistrationCycleModal({
  open,
  onClose,
  r,
  language,
  settings,
  canEdit,
  saving,
  onSave,
}) {
  const localTimeZone = getUserTimeZone();
  const [draft, setDraft] = useState(() => createRegistrationCycleDraft(settings));
  const schedule = useMemo(() => getRegistrationCycleSchedule(draft), [draft]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    await onSave(createRegistrationCycleSavePatch(draft, schedule));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="1120px"
      className="registration-cycle-site-modal"
      title={r.cycle.title}
      headerContent={
        <div className="registration-cycle-modal-heading">
          <img
            src="/images/registration-settings/registration-cycle-icon.webp"
            alt=""
            aria-hidden="true"
          />
          <div>
            <h2 className="site-modal__title">{r.cycle.title}</h2>
            <p className="site-modal__subtitle">{r.cycle.description}</p>
          </div>
        </div>
      }
      closeLabel={r.common.close}
      footer={
        <div className="registration-modal-footer registration-modal-footer--spread">
          <button
            type="button"
            className="registration-secondary-button registration-cycle-reset-button"
            disabled={!canEdit}
            onClick={() => setDraft(getDefaultRegistrationCycleDraft())}
          >
            <img
              src="/images/registration-settings/reset-defaults-icon.webp"
              alt=""
              aria-hidden="true"
            />
            {r.cycle.defaults}
          </button>

          <div className="registration-modal-footer__actions">
            <button
              type="button"
              className="registration-secondary-button"
              onClick={onClose}
            >
              {r.common.cancel}
            </button>

            <button
              type="button"
              className="admin-primary-button registration-cycle-save-button"
              disabled={!canEdit || saving}
              onClick={handleSave}
            >
              <img
                src="/images/admin/icons/registration/save.svg"
                alt=""
                aria-hidden="true"
              />
              {saving ? r.common.saving : r.cycle.save}
            </button>
          </div>
        </div>
      }
    >
      <div className="registration-modal-stack registration-modal-stack--compact">
        <div
          className="registration-mode-switch"
          role="group"
          aria-label={r.cycle.modeLabel}
        >
          <button
            type="button"
            className={draft.cycleMode === "automatic" ? "is-active" : ""}
            onClick={() => update("cycleMode", "automatic")}
          >
            <img
              src="/images/registration-settings/registration-cycle-icon.webp"
              alt=""
              aria-hidden="true"
            />
            <span>{r.cycle.automaticMode}</span>
          </button>
          <button
            type="button"
            className={draft.cycleMode === "manual" ? "is-active" : ""}
            onClick={() => update("cycleMode", "manual")}
          >
            <img
              src="/images/registration-settings/registration-fields-icon.webp"
              alt=""
              aria-hidden="true"
            />
            <span>{r.cycle.manualMode}</span>
          </button>
        </div>

        <RegistrationCyclePreview
          schedule={schedule}
          language={language}
          localTimeZone={localTimeZone}
          r={r}
        />

        <RegistrationCycleFields
          draft={draft}
          schedule={schedule}
          canEdit={canEdit}
          r={r}
          update={update}
        />
      </div>
    </Modal>
  );
}

export default RegistrationCycleModal;
