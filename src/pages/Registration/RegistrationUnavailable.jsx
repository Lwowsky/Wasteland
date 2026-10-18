import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import { publicAsset } from "../../utils/publicAsset.js";
import { getUnavailableState } from "./registrationMessages.js";

// Registration and protected player/plan pages intentionally share the same card design.
import "../../features/contentAccess/ContentAccessGate.css";

function RegistrationUnavailable({ t, rules, reason, language, useLocalTime }) {
  const status = getUnavailableState({ rules, reason, t, language, useLocalTime });

  return (
    <section id="registration" className="registration registration--unavailable content-access-page">
      <PagePanel className="content-access-panel">
        <div className="content-access-icon" aria-hidden="true">
          <img src={publicAsset("/images/registration-settings/registration-fields-icon.webp")} alt="" width="76" height="76" />
        </div>
        <h1>{t.registration.title}</h1>
        <h2>{status.title}</h2>
        <p role="status">{status.text}</p>
      </PagePanel>
    </section>
  );
}

export default RegistrationUnavailable;
