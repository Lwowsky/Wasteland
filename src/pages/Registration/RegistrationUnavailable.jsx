import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import { publicAsset } from "../../utils/publicAsset.js";
import RegistrationHeader from "./RegistrationHeader.jsx";
import { getUnavailableState } from "./registrationMessages.js";

function RegistrationUnavailable({
  t,
  rules,
  reason,
  language,
  useLocalTime,
}) {
  const status = getUnavailableState({
    rules,
    reason,
    t,
    language,
    useLocalTime,
  });

  return (
    <section id="registration" className="registration">
      <PagePanel className="registration__panel registration__panel--unavailable">
        <RegistrationHeader t={t} />

        <div className={`registration-access-card registration-access-card--${status.state}`} role="status">
          <div className="registration-access-card__icon" aria-hidden="true">
            <img src={publicAsset(status.icon)} alt="" width="42" height="42" />
          </div>

          <div className="registration-access-card__content">
            <h2>{t.registration.title}</h2>
            <strong>{status.title}</strong>
            <p>{status.text}</p>
          </div>
        </div>
      </PagePanel>
    </section>
  );
}

export default RegistrationUnavailable;
