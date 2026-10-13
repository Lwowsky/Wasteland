import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_REGISTRATION_SETTINGS,
  normalizeRegistrationSettings,
} from "../../../features/registration/registrationSettings.js";
import { getAdminRegistrationSettings } from "../services/registrationSettingsApi.js";

export default function useAdminRegistrationSettings({ enabled }) {
  const [settings, setSettings] = useState(() =>
    normalizeRegistrationSettings(DEFAULT_REGISTRATION_SETTINGS),
  );
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setErrorKey("");
    try {
      const result = await getAdminRegistrationSettings();
      const nextSettings = normalizeRegistrationSettings(result.settings);
      setSettings(nextSettings);
      setLoaded(true);
      return nextSettings;
    } catch (error) {
      setErrorKey("load");
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!enabled || loaded) {
      return undefined;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorKey("");

      try {
        const result = await getAdminRegistrationSettings();

        if (!active) {
          return;
        }

        setSettings(normalizeRegistrationSettings(result.settings));
        setLoaded(true);
      } catch (error) {
        console.error("Load registration settings:", error);

        if (active) {
          setErrorKey("load");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [enabled, loaded]);

  return {
    loaded,
    settings,
    setSettings,
    loading: enabled && !loaded ? true : loading,
    errorKey,
    reload,
  };
}
