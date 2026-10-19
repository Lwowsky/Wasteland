import { formatDate, getUserTimeZone } from "../../utils/date.js";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Display-only helpers. Access decisions remain in registrationCycle.js and
// server-side controls; never infer permission from this formatted message.
export function getClosedCycleCopy({ copy, resource, nextOpensAt, nowMs, language, useLocalTime }) {
  const label = copy.cycleClosed;
  const isPlayers = resource === "players";
  const opensAtMs = Date.parse(nextOpensAt || "");
  const upcoming = isPlayers && Number.isFinite(opensAtMs) && opensAtMs > nowMs;

  const timeZone = useLocalTime ? getUserTimeZone() : "UTC";
  const date = upcoming ? formatDate(nextOpensAt, language, timeZone, true) : "";
  const text = isPlayers
    ? upcoming
      ? label.players.replace("{{date}}", date)
      : label.playersUnknown
    : label.finalPlan;

  let countdown = "";
  if (upcoming) {
    // Round UP, so the clock never shows zero while registration is closed.
    const minutes = Math.ceil((opensAtMs - nowMs) / MINUTE_MS);
    const days = Math.floor(minutes / (DAY_MS / MINUTE_MS));
    const hours = Math.floor((minutes % (DAY_MS / MINUTE_MS)) / (HOUR_MS / MINUTE_MS));
    const restMinutes = minutes % (HOUR_MS / MINUTE_MS);
    countdown = label.opensIn
      .replace("{{days}}", String(days))
      .replace("{{hours}}", String(hours).padStart(2, "0"))
      .replace("{{minutes}}", String(restMinutes).padStart(2, "0"));
  }

  return { title: label.title, text, countdown };
}
