import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_REGISTRATION_CYCLE_SETTINGS } from "../shared/registrationConfig.js";
import { getRegistrationCycleSchedule } from "../shared/registrationCycle.js";
import { getHomeCountdownPhases } from "../src/pages/Home/utils/homeCountdownPhases.js";

const DAY = 24 * 60 * 60 * 1000;
const start = Date.parse("2026-10-17T10:00:00.000Z");
const settings = { ...DEFAULT_REGISTRATION_CYCLE_SETTINGS, wastelandDurationHours: 72 };

test("Wasteland always ends exactly 24 hours after starting, despite legacy values", () => {
  const schedule = getRegistrationCycleSchedule(settings, start);
  assert.equal(schedule.eventStartAtMs, start);
  assert.equal(schedule.eventEndAtMs, start + DAY);
  assert.equal(schedule.eventEndAt, "2026-10-18T10:00:00.000Z");
});

test("Countdown switches at start and after 24 hours without an API request", () => {
  const before = getHomeCountdownPhases(settings, start - 1);
  const beginning = getHomeCountdownPhases(settings, start);
  const lastSecond = getHomeCountdownPhases(settings, start + DAY - 1000);
  const after = getHomeCountdownPhases(settings, start + DAY);
  assert.equal(before.event.phase, "upcoming");
  assert.equal(before.event.target, start);
  assert.equal(beginning.event.phase, "active");
  assert.equal(beginning.event.target, start + DAY);
  assert.equal(lastSecond.event.phase, "active");
  assert.equal(after.event.phase, "upcoming");
  assert.equal(after.event.target, start + 14 * DAY);
});

test("Manual registration dates do not modify Wasteland duration", () => {
  const manual = getRegistrationCycleSchedule({
    ...settings,
    cycleMode: "manual",
    manualOpensAt: "2026-10-15T00:00:00.000Z",
    manualClosesAt: "2026-10-17T00:00:00.000Z",
  }, start);
  assert.equal(manual.eventEndAtMs - manual.eventStartAtMs, DAY);
  assert.equal(manual.opensAt, "2026-10-15T00:00:00.000Z");
});
