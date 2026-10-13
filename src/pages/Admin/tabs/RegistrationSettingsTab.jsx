import { publicAsset } from "../../../utils/publicAsset.js";

import RegistrationSettingsModals from "../registration/RegistrationSettingsModals.jsx";
import RegistrationSettingsOverview from "../registration/RegistrationSettingsOverview.jsx";
import useRegistrationSettingsAdmin from "../registration/useRegistrationSettingsAdmin.js";

import "./RegistrationSettingsTab.css";

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

      {toast && (
        <div className="registration-settings-toast" role="status">
          {toast}
        </div>
      )}

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
