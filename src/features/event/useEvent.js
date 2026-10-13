import { useEffect, useState } from "react";

import { getRegistrationSettings } from "../registration/registrationApi.js";
import { normalizeRegistrationSettings } from "../registration/registrationSettings.js";
import { getRegistrationCycleSchedule } from "../registration/registrationCycle.js";

const STATIC_REGION = {
  region: 987,
  regionName: "We are One",
};

const SETTINGS_REFRESH_MS = 5 * 60 * 1000;

function resolveOrganizerAlliance(settings) {
  const tag = String(settings?.hostAlliance || "").trim().toUpperCase();
  const alliances = Array.isArray(settings?.alliances) ? settings.alliances : [];
  const match = alliances.find(
    (alliance) => String(alliance?.tag || "").trim().toUpperCase() === tag,
  );

  if (match?.name && tag) {
    return `${tag} — ${match.name}`;
  }

  return tag || match?.name || "";
}

function buildEvent(settings = {}) {
  const schedule = getRegistrationCycleSchedule(settings, Date.now());

  return {
    ...STATIC_REGION,
    wastelandDate: new Date(schedule.eventStartAtMs),
    registrationOpensAt: new Date(schedule.openAtMs),
    registrationDeadline: new Date(schedule.closeAtMs),
    organizerAlliance: resolveOrganizerAlliance(settings),
    governor: String(settings.governor || "").trim(),
  };
}

function useEvent() {
  const [event, setEvent] = useState(null);
  const [registrationConfig, setRegistrationConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let requestVersion = 0;

    async function loadEvent({ force = false, showLoading = false } = {}) {
      const currentVersion = ++requestVersion;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const result = await getRegistrationSettings({ force });
        const settings = normalizeRegistrationSettings(result.settings || {});

        if (cancelled || currentVersion !== requestVersion) {
          return;
        }

        setRegistrationConfig({
          ...result,
          settings,
        });
        setEvent(buildEvent(settings));
        setError(null);
      } catch (loadError) {
        console.error("Load event settings:", loadError);

        if (!cancelled && currentVersion === requestVersion) {
          setError(loadError);
        }
      } finally {
        if (
          showLoading &&
          !cancelled &&
          currentVersion === requestVersion
        ) {
          setLoading(false);
        }
      }
    }

    loadEvent({ showLoading: true });

    const timer = setInterval(() => {
      loadEvent({ force: true });
    }, SETTINGS_REFRESH_MS);

    function handleSettingsUpdated() {
      loadEvent({ force: true });
    }

    window.addEventListener(
      "registration-settings-updated",
      handleSettingsUpdated,
    );

    function handleStorage(event) {
      if (event.key === "wasteland-registration-settings-updated") {
        handleSettingsUpdated();
      }
    }

    // Browser tabs may have cached an old public registration state.
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleSettingsUpdated);

    return () => {
      cancelled = true;
      requestVersion += 1;
      clearInterval(timer);
      window.removeEventListener(
        "registration-settings-updated",
        handleSettingsUpdated,
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleSettingsUpdated);
    };
  }, []);

  return {
    event,
    registrationConfig,
    loading,
    error,
  };
}

export default useEvent;
