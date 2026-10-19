import { getAutomaticRegistrationCycleSchedule } from "../../../shared/registrationCycle.js";

// Pure date computation for the CLOSED public player page.
// Does not perform HTTP requests, change authorization or update the server.
export function getNextRegistrationOpening(settings, nowMs = Date.now()) {
  if (!settings || settings.cycleMode === "manual" || !Number.isFinite(nowMs)) {
    return null;
  }

  const candidate = getAutomaticRegistrationCycleSchedule(settings, nowMs);
  const next = candidate.openAtMs > nowMs
    ? candidate
    : getAutomaticRegistrationCycleSchedule(settings, candidate.eventStartAtMs + 1);

  return next.openAtMs > nowMs ? next.opensAt : null;
}
