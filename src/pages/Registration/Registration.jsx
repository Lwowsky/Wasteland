import { useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";

import RegistrationSection from "./RegistrationSection.jsx";

import "./Registration.css";

function Registration() {
  const {
    t,
    language,
    useLocalTime,
    registrationConfig,
    eventLoading,
    eventError,
  } = useOutletContext();

  return (
    <>
      <PageMeta
        title={t.registration.title}
        description={t.registration.text}
        language={language}
        path="registration"
      />

      <Page>
        {eventLoading && (
          <PagePanel>
            <p>{t.registration.loading}</p>
          </PagePanel>
        )}

        {!eventLoading && eventError && (
          <PagePanel>
            <p>{t.registration.loadError}</p>
          </PagePanel>
        )}

        {!eventLoading && !eventError && registrationConfig && (
          <RegistrationSection
            key={registrationConfig.period?.id || "registration"}
            t={t}
            language={language}
            useLocalTime={useLocalTime}
            registrationConfig={registrationConfig}
          />
        )}
      </Page>
    </>
  );
}

export default Registration;
