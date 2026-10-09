import { useEffect, useState } from "react";

import { DEFAULT_SITE_SETTINGS } from "../../../shared/siteSettingsConfig.js";
import { getSiteSettings } from "./siteSettingsApi.js";

const DEFAULT_SETTINGS = DEFAULT_SITE_SETTINGS;

function useSiteSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load({ force = false } = {}) {
      try {
        const result = await getSiteSettings({ force });

        if (!active) return;

        setSettings({
          ...DEFAULT_SETTINGS,
          ...(result.settings || {}),
        });
        setError(null);
      } catch (nextError) {
        console.error("Load site settings:", nextError);

        if (active) setError(nextError);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    function handleUpdated() {
      load({ force: true });
    }

    window.addEventListener("site-settings-updated", handleUpdated);

    return () => {
      active = false;
      window.removeEventListener("site-settings-updated", handleUpdated);
    };
  }, []);

  return { settings, loading, error };
}

export default useSiteSettings;
