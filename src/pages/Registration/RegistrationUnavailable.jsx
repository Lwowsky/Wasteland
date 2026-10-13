import { AlertCircle } from "lucide-react";

import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import RegistrationHeader from "./RegistrationHeader.jsx";
import { getUnavailableMessage } from "./registrationMessages.js";

function RegistrationUnavailable({
  t,
  rules,
  reason,
  language,
  useLocalTime,
}) {
  return (
    <section id="registration" className="registration">
      <PagePanel className="registration__panel">
        <RegistrationHeader t={t} />

        <div className="registration-success" role="status">
          <div className="registration-success__icon">
            <AlertCircle size={24} aria-hidden="true" />
          </div>

          <div>
            <strong>{t.registration.unavailable.title}</strong>
            <p>
              {getUnavailableMessage({
                rules,
                reason,
                t,
                language,
                useLocalTime,
              })}
            </p>
          </div>
        </div>
      </PagePanel>
    </section>
  );
}

export default RegistrationUnavailable;
