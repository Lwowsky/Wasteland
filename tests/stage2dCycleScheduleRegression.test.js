import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_REGISTRATION_CYCLE_SETTINGS,
} from "../shared/registrationConfig.js";
import {
  getRegistrationCycleSchedule,
} from "../shared/registrationCycle.js";
import {
  getRegistrationCycleKey,
  isScheduleOpen,
} from "../worker/src/services/registrationCycle.js";

const settings = DEFAULT_REGISTRATION_CYCLE_SETTINGS;
const iso = (value) => new Date(value).toISOString();

// These regression tests protect the existing weekly-open / weekly-closed
// cadence without changing production scheduling or D1 retention behavior.
test("Stage 2D: automatic registration opens for one week, every two weeks", () => {
  const first = getRegistrationCycleSchedule(settings, Date.parse("2026-10-10T00:00:00Z"));
  const second = getRegistrationCycleSchedule(settings, Date.parse("2026-10-24T00:00:00Z"));

  assert.equal(first.opensAt, "2026-10-09T00:00:00.000Z");
  assert.equal(first.closesAt, "2026-10-16T00:00:00.000Z");
  assert.equal(second.opensAt, "2026-10-23T00:00:00.000Z");
  assert.equal(second.closesAt, "2026-10-30T00:00:00.000Z");
  assert.equal(first.closeAtMs - first.openAtMs, 7 * 24 * 60 * 60 * 1000);
  assert.equal(second.openAtMs - first.openAtMs, 14 * 24 * 60 * 60 * 1000);
  assert.notEqual(getRegistrationCycleKey(settings, first), getRegistrationCycleKey(settings, second));
});

test("Stage 2D: registration remains closed in the intervening week", () => {
  const schedule = getRegistrationCycleSchedule(settings, Date.parse("2026-10-10T00:00:00Z"));
  assert.equal(schedule.opensAt, "2026-10-09T00:00:00.000Z");
  assert.equal(isScheduleOpen(schedule, Date.parse("2026-10-15T23:59:59Z")), true);
  assert.equal(isScheduleOpen(schedule, Date.parse("2026-10-18T00:00:00Z")), false);
  const next = getRegistrationCycleSchedule(settings, Date.parse("2026-10-24T00:00:00Z"));
  assert.equal(isScheduleOpen(next, Date.parse("2026-10-24T00:00:00Z")), true);
});

test("Stage 2D: manual dates remain independent from automatic defaults", () => {
  const manual = getRegistrationCycleSchedule({
    ...settings,
    cycleMode: "manual",
    manualOpensAt: "2026-10-15T09:54:00.000Z",
    manualClosesAt: "2026-10-17T09:54:00.000Z",
  }, Date.parse("2026-10-16T00:00:00Z"));
  assert.equal(manual.opensAt, iso("2026-10-15T09:54:00Z"));
  assert.equal(manual.closesAt, iso("2026-10-17T09:54:00Z"));
  assert.equal(getRegistrationCycleKey({ cycleMode: "manual" }, manual), "manual:2026-10-15T09:54:00.000Z");
});
