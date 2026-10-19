import { useEffect, useState } from "react";
import useNow from "../../hooks/useNow.js";
import { DEFAULT_SITE_SETTINGS } from "../../../shared/siteSettingsConfig.js";

import { getRegistrationSettings } from "../registration/registrationApi.js";
import { isPublicSnapshotEnabled } from "../players/publicSnapshot.js";
import { normalizeRegistrationSettings } from "../registration/registrationSettings.js";
import { getRegistrationCycleSchedule, getAutomaticRegistrationCycleSchedule } from "../registration/registrationCycle.js";

// One canonical source for default region identity; site settings override it.
const STATIC_REGION = {
  region: DEFAULT_SITE_SETTINGS.regionNumber,
  regionName: DEFAULT_SITE_SETTINGS.regionName,
};

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

function buildEvent(settings = {}, nowMs = Date.now()) {
  const schedule = getRegistrationCycleSchedule(settings, nowMs);
  // Old manual dates are not a promise of another registration period.
  // In automatic mode use the upcoming cycle instead of displaying dates
  // belonging to the previous event.
  const nextAutomatic = getAutomaticRegistrationCycleSchedule(settings, nowMs);
  const manualExpired = settings.cycleMode === "manual" &&
    Number(schedule.closeAtMs) <= nowMs;
  const displaySchedule = settings.cycleMode === "manual" ? schedule :
    schedule.closeAtMs <= nowMs ?
      getAutomaticRegistrationCycleSchedule(settings, nextAutomatic.eventStartAtMs + 1) : schedule;
  return {
    ...STATIC_REGION,
    wastelandDate: new Date(schedule.eventStartAtMs),
    registrationOpensAt: manualExpired || !displaySchedule.openAtMs ? null : new Date(displaySchedule.openAtMs),
    registrationDeadline: manualExpired || !displaySchedule.closeAtMs ? null : new Date(displaySchedule.closeAtMs),
    manualScheduleExpired: manualExpired,
    organizerAlliance: resolveOrganizerAlliance(settings),
    governor: String(settings.governor || "").trim(),
  };
}

function useEvent() {
  // Calendar dates roll forward even if a player leaves the tab open for days.
  // Pure client-side calculation: no polling or additional Worker/D1 reads.
  const nowMs = useNow(60_000);
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
        const result = await getRegistrationSettings({
          force,
          // Once JSON snapshots are enabled, public calendar reads never
          // silently switch to a paid/metered Worker path on repeated F5.
          staticOnly: !force && isPublicSnapshotEnabled(),
        });
        const settings = normalizeRegistrationSettings(result.settings || {});

        if (cancelled || currentVersion !== requestVersion) {
          return;
        }

        setRegistrationConfig({
          ...result,
          settings,
        });
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

    return () => {
      cancelled = true;
      requestVersion += 1;
      window.removeEventListener(
        "registration-settings-updated",
        handleSettingsUpdated,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const event = registrationConfig?.settings
    ? buildEvent(registrationConfig.settings, nowMs)
    : null;

  return {
    event,
    registrationConfig,
    loading,
    error,
  };
}

export default useEvent;
