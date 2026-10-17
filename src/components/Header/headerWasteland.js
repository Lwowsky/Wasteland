import { getRegistrationCycleSchedule } from "../../../shared/registrationCycle.js";
import { getHomeCountdownPhases } from "../../pages/Home/utils/homeCountdownPhases.js";

// Both the heading and its date follow the existing public countdown phase.
// This calculation runs entirely in the browser; it never requests Worker/D1.
export function getHeaderWasteland(settings, nowMs = Date.now()) {
  const phase = getHomeCountdownPhases(settings, nowMs)?.event;
  if (!phase) return null;

  const active = phase.phase === "active";
  const startAtMs = active
    ? getRegistrationCycleSchedule(settings, phase.target + 1).eventStartAtMs
    : phase.target;

  if (!Number.isFinite(startAtMs)) return null;
  return { active, date: new Date(startAtMs) };
}
