import { getRegistrationCycleSchedule } from "../../../../shared/registrationCycle.js";
import {
  DEFAULT_WASTELAND_DURATION_HOURS,
  DEFAULT_WASTELAND_INTERVAL_DAYS,
} from "../../../../shared/registrationConfig.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function futureTime(value, now) {
  const number = Number(value);
  return Number.isFinite(number) && number > now ? number : null;
}

// Resolves the CURRENT Wasteland, even when getRegistrationCycleSchedule()
// would already move on to the next one after the event begins.
export function getHomeCountdownPhases(settings, nowMs = Date.now()) {
  if (!settings || !Number.isFinite(nowMs)) {
    return null;
  }

  const durationMs =
    positiveNumber(settings.wastelandDurationHours, DEFAULT_WASTELAND_DURATION_HOURS) *
    HOUR_MS;
  const intervalMs =
    positiveNumber(settings.wastelandIntervalDays, DEFAULT_WASTELAND_INTERVAL_DAYS) *
    DAY_MS;

  const activeCandidate = getRegistrationCycleSchedule(settings, nowMs - durationMs);
  const active =
    nowMs >= activeCandidate.eventStartAtMs &&
    nowMs < activeCandidate.eventEndAtMs;
  const upcomingEvent = active
    ? null
    : nowMs >= activeCandidate.eventEndAtMs
      ? getRegistrationCycleSchedule(settings, activeCandidate.eventStartAtMs + 1)
      : activeCandidate;

  const event = active
    ? { phase: "active", target: activeCandidate.eventEndAtMs }
    : { phase: "upcoming", target: upcomingEvent.eventStartAtMs };

  const currentRegistration = getRegistrationCycleSchedule(settings, nowMs);
  const nextRegistration = getRegistrationCycleSchedule(
    settings,
    currentRegistration.eventStartAtMs + 1,
  );
  const opensAt = Number(currentRegistration.openAtMs);
  const closesAt = Number(currentRegistration.closeAtMs);

  if (settings.publicRegistration === false) {
    return { event, registration: { phase: "disabled", target: null } };
  }

  if (opensAt > 0 && closesAt > opensAt && nowMs >= opensAt && nowMs < closesAt) {
    return { event, registration: { phase: "open", target: closesAt } };
  }

  // Manual dates only describe a single opening. Do not invent the date
  // of a new manual cycle after that opening has expired.
  if (settings.cycleMode === "manual") {
    return {
      event,
      registration: {
        phase: "closed",
        target: futureTime(opensAt, nowMs),
      },
    };
  }

  const nextOpening =
    futureTime(opensAt, nowMs) ??
    futureTime(nextRegistration.openAtMs, nowMs);

  // A malformed configuration cannot produce a predictable next opening.
  const target = nextOpening && nextOpening - nowMs <= intervalMs * 2
    ? nextOpening
    : null;

  return { event, registration: { phase: "closed", target } };
}
