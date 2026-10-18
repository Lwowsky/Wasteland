import AccessStatusCard from "../../components/AccessStatusCard/AccessStatusCard.jsx";
import { publicAsset } from "../../utils/publicAsset.js";
import { getUnavailableState } from "./registrationMessages.js";

// Registration and protected player/plan pages intentionally share the same card design.
import "../../features/contentAccess/ContentAccessGate.css";

function RegistrationUnavailable({ t, rules, reason, language, useLocalTime }) {
  const status = getUnavailableState({ rules, reason, t, language, useLocalTime });

  return (
    <section id="registration" className="registration registration--unavailable content-access-page">
      <AccessStatusCard
        iconSrc={publicAsset("/images/registration-settings/registration-fields-icon.webp")}
        title={t.registration.title}
        heading={status.title}
        text={status.text}
      />
    </section>
  );
}

export default RegistrationUnavailable;
