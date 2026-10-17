import { publicAsset } from "../../../utils/publicAsset.js";
import Modal from "../../../components/Modal/Modal.jsx";

import RegistrationSettingsModals from "../registration/RegistrationSettingsModals.jsx";
import RegistrationSettingsOverview from "../registration/RegistrationSettingsOverview.jsx";
import useRegistrationSettingsAdmin from "../registration/useRegistrationSettingsAdmin.js";

import "./RegistrationSettingsTab.css";
import "./RegistrationStatusResultModal.css";

function RegistrationSettingsTab({
  t,
  language,
  settings,
  setSettings,
  canEdit = true,
  loading = false,
  loadError = "",
  players = [],
}) {
  const r = t.registration;
  const shifts = t.players.shifts;
  const controller = useRegistrationSettingsAdmin({
    settings,
    setSettings,
    canEdit,
    players,
  });

  if (loading) {
    return <div className="admin-empty-state">{t.common.loading}</div>;
  }

  const error = controller.errorKey ? r.errors[controller.errorKey] : "";
  const toast = controller.toastKey
    ? r.notifications[controller.toastKey]
    : "";

  const isStatusResult = controller.toastKey === "closedOnServer" || controller.toastKey === "openedOnServer";
  const statusClosed = controller.toastKey === "closedOnServer";

  return (
    <section className="admin-section admin-registration-settings">
      <div className="admin-section__head registration-settings-page-head">
        <div>
          <h2>{r.title}</h2>
          <p>{r.description}</p>
        </div>

        <button
          type="button"
          className="registration-secondary-button registration-defaults-button"
          disabled={!canEdit || Boolean(controller.savingSection)}
          onClick={controller.requestRestoreDefaults}
        >
          <img
            className="registration-button-icon"
            src={publicAsset("/images/registration-settings/reset-defaults-icon.webp")}
            alt=""
            aria-hidden="true"
          />
          {r.defaultsButton}
        </button>
      </div>

      {(loadError || error) && (
        <div className="admin-registration-message admin-registration-message--error">
          {loadError || error}
        </div>
      )}

      {toast && !isStatusResult && (
        <div className="registration-settings-toast" role="status">
          {toast}
        </div>
      )}

      <Modal
        open={isStatusResult}
        onClose={controller.dismissToast}
        title={statusClosed ? r.resultModal.closedTitle : r.resultModal.openedTitle}
        width="580px"
        closeLabel={r.common.cancel}
        className="registration-status-result-modal"
        footer={<button type="button" className="admin-primary-button registration-status-result-modal__action" onClick={controller.dismissToast}>{r.resultModal.acknowledge}</button>}
      >
        <div className="registration-status-result-modal__content" role="status">
          <img
            src={publicAsset(statusClosed ? "/images/registration-settings/cycle-close-icon.webp" : "/images/registration-settings/cycle-open-icon.webp")}
            alt=""
            aria-hidden="true"
            className="registration-status-result-modal__icon"
          />
          <div className="registration-status-result-modal__text">
            <p className="registration-status-result-modal__message">{toast}</p>
            <p className="registration-status-result-modal__note">{r.resultModal.staticNote}</p>
          </div>
        </div>
      </Modal>

      <RegistrationSettingsOverview
        r={r}
        shifts={shifts}
        language={language}
        settings={settings}
        summary={controller.summary}
        canEdit={canEdit}
        saving={Boolean(controller.savingSection)}
        onOpen={controller.setActiveModal}
        onToggleRegistration={controller.requestToggleRegistration}
      />

      <RegistrationSettingsModals
        r={r}
        shifts={shifts}
        language={language}
        settings={settings}
        canEdit={canEdit}
        controller={controller}
      />
    </section>
  );
}

export default RegistrationSettingsTab;
