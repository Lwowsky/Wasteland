import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../config/site.js";

import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

import NotFound from "../pages/NotFound/NotFound.jsx";

import useEvent from "../features/event/useEvent.js";
import SiteSettingsContext from "../features/site/SiteSettingsContext.jsx";
import useSiteSettings from "../features/site/useSiteSettings.js";
import translations from "../i18n/index.js";

function MainLayout() {
  const { lang } = useParams();

  const isSupported = SUPPORTED_LANGUAGES.includes(lang);
  const language = isSupported ? lang : DEFAULT_LANGUAGE;
  const [useLocalTime, setUseLocalTime] = useState(true);
  const { settings: siteSettings } = useSiteSettings();
  const {
    event,
    registrationConfig,
    loading: eventLoading,
    error: eventError,
  } = useEvent();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (!isSupported) {
    return <NotFound />;
  }

  const t = translations[language];
  const resolvedEvent = event
    ? {
        ...event,
        region: siteSettings.regionNumber ?? event.region,
        regionName: siteSettings.regionName || event.regionName,
      }
    : event;

  return (
    <SiteSettingsContext.Provider value={siteSettings}>
      <div className="app">
        <Header
          t={t}
          language={language}
          useLocalTime={useLocalTime}
          setUseLocalTime={setUseLocalTime}
          event={resolvedEvent}
          siteSettings={siteSettings}
          loading={eventLoading}
          error={eventError}
        />

        <Outlet
          context={{
            t,
            language,
            useLocalTime,
            event: resolvedEvent,
            eventLoading,
            eventError,
            registrationConfig,
            siteSettings,
          }}
        />

        <Footer t={t} language={language} siteSettings={siteSettings} />
      </div>
    </SiteSettingsContext.Provider>
  );
}

export default MainLayout;
