import { Suspense, useEffect, useState } from "react";
import RouteLoading from "../components/RouteLoading/RouteLoading.jsx";
import { Outlet, useParams } from "react-router-dom";

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../config/site.js";
import { savePreferredLanguage } from "../utils/language.js";

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
    const previousLang = document.documentElement.lang;
    const previousDir = document.documentElement.getAttribute("dir");
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

    if (isSupported) {
      savePreferredLanguage(language);
    }
    return () => {
      document.documentElement.lang = previousLang;
      if (previousDir === null) document.documentElement.removeAttribute("dir");
      else document.documentElement.dir = previousDir;
    };
  }, [isSupported, language]);

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
      {/* Keep the interface geometry consistent across languages. Arabic text
          is handled by the scoped bidi styles; the document remains RTL for
          language-aware browser behavior and accessibility. */}
      <div className="app" dir="ltr">
        <Header
          t={t}
          language={language}
          useLocalTime={useLocalTime}
          setUseLocalTime={setUseLocalTime}
          event={resolvedEvent}
          registrationConfig={registrationConfig}
          siteSettings={siteSettings}
          loading={eventLoading}
          error={eventError}
        />

        {/* Keep the header and footer mounted while lazy routes load. */}
        <Suspense fallback={<RouteLoading />}>
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
        </Suspense>

        <Footer t={t} language={language} siteSettings={siteSettings} />
      </div>
    </SiteSettingsContext.Provider>
  );
}

export default MainLayout;
