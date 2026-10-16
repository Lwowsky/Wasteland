import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";

import RegistrationSection from "./RegistrationSection.jsx";
import { getRegistrationSettings } from "../../features/registration/registrationApi.js";
import { normalizeRegistrationSettings } from "../../features/registration/registrationSettings.js";

import "./Registration.css";

function Registration() {
  const {
    t,
    language,
    useLocalTime,
  } = useOutletContext();

  const [verified, setVerified] = useState({ loading: true, result: null, error: null });

  useEffect(() => {
    let active = true;
    // Header/home use the static snapshot. The registration FORM must check
    // the current D1-backed Worker state to handle manual opening/closure.
    getRegistrationSettings({ serverOnly: true })
      .then((result) => {
        if (active) setVerified({
          loading: false,
          result: { ...result, settings: normalizeRegistrationSettings(result.settings || {}) },
          error: null,
        });
      })
      .catch((error) => {
        if (active) setVerified({ loading: false, result: null, error });
      });
    return () => { active = false; };
  }, []);

  return (
    <>
      <PageMeta
        title={t.registration.title}
        description={t.registration.text}
        language={language}
        path="registration"
      />

      <Page>
        {verified.loading && (
          <PagePanel>
            <p>{t.registration.loading}</p>
          </PagePanel>
        )}

        {!verified.loading && verified.error && (
          <PagePanel>
            <p>{t.registration.loadError}</p>
          </PagePanel>
        )}

        {!verified.loading && !verified.error && verified.result && (
          <RegistrationSection
            key={verified.result.period?.id || "registration"}
            t={t}
            language={language}
            useLocalTime={useLocalTime}
            registrationConfig={verified.result}
          />
        )}
      </Page>
    </>
  );
}

export default Registration;
