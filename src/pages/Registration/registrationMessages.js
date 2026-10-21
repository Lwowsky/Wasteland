import { getRegistrationCycleSchedule } from "../../features/registration/registrationCycle.js";
import { formatDate, getUserTimeZone } from "../../utils/date.js";

export function getSubmitErrorMessage(code, t) {
  const messages = {
    ALREADY_REGISTERED: t.registration.errors.alreadyRegistered,
    REGISTRATION_CLOSED: t.registration.errors.closed,
    REGISTRATION_DISABLED: t.registration.errors.disabled,
    INVALID_DATA: t.registration.errors.invalidData,
    REQUIRED_FIELDS: t.registration.errors.requiredFields,
    CHALLENGE_REQUIRED: t.registration.errors.challenge,
    CHALLENGE_FAILED: t.registration.errors.challenge,
    CHALLENGE_UNAVAILABLE: t.registration.errors.challengeUnavailable,
    RATE_LIMITED: t.registration.errors.rateLimited,
  };

  return messages[code] || t.registration.errors.submit;
}

function getClosedMessage(reason, t) {
  if (reason === "REGISTRATION_DISABLED") {
    return t.registration.unavailable.disabled;
  }

  return t.registration.unavailable.closed;
}

export function getUnavailableState({
  rules,
  reason,
  t,
  language,
  useLocalTime,
}) {
  if (reason === "REGISTRATION_DISABLED") {
    return {
      title: t.registration.unavailable.disabledTitle,
      text: t.registration.unavailable.disabled,
      state: "disabled",
      icon: "/images/registration-settings/cycle-close-icon.webp",
    };
  }

  const schedule = getRegistrationCycleSchedule(rules, Date.now());

  if (Date.now() < schedule.openAtMs) {
    const timeZone = useLocalTime ? getUserTimeZone() : "UTC";
    const date = formatDate(schedule.opensAt, language, timeZone, true);

    return {
      title: t.registration.unavailable.notOpenYetTitle,
      text: `${t.registration.unavailable.notOpenYet} ${t.registration.unavailable.opensAt.replace("{{date}}", date)}`,
      state: "notOpenYet",
      icon: "/images/registration-settings/cycle-open-icon.webp",
    };
  }

  return {
    title: t.registration.unavailable.closedTitle,
    text: getClosedMessage(reason, t),
    state: "closed",
    icon: "/images/registration-settings/cycle-close-icon.webp",
  };
}

