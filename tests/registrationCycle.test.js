import test from "node:test";
import assert from "node:assert/strict";

import {
  computeGameDayResetCloseAt,
  computeRegistrationCloseAt,
  computeRegistrationOpenAt,
  getAutomaticRegistrationCycleSchedule,
  getNextWastelandStart,
  getRegistrationCycleSchedule,
} from "../shared/registrationCycle.js";
import {
  formatRemainingTime,
  fromUtcDateTimeLocalValue,
  toUtcDateTimeLocalValue,
} from "../src/features/registration/registrationCycle.js";
import {
  createRegistrationCycleDraft,
  createRegistrationCycleSavePatch,
  getDefaultRegistrationCycleDraft,
  getUtcTime,
} from "../src/pages/Admin/registration/registrationCycleDraft.js";

const HOUR = 60 * 60 * 1000;

test("cycle: next Wasteland respects anchor and 14-day interval", () => {
  const anchor = "2026-10-03T10:00:00.000Z";

  assert.equal(
    new Date(getNextWastelandStart(Date.parse("2026-10-01T00:00:00Z"), anchor, 14)).toISOString(),
    anchor,
  );
  assert.equal(
    new Date(getNextWastelandStart(Date.parse("2026-10-04T00:00:00Z"), anchor, 14)).toISOString(),
    "2026-10-17T10:00:00.000Z",
  );
});

test("cycle: hours-before close mode subtracts configured hours", () => {
  const event = Date.parse("2026-10-17T10:00:00.000Z");
  const close = computeRegistrationCloseAt({
    eventStartAtMs: event,
    closeMode: "hoursBeforeStart",
    closeBeforeHours: 34,
  });

  assert.equal(close, event - 34 * HOUR);
});

test("cycle: game-day-reset close uses the previous Friday 00:00 UTC", () => {
  const event = Date.parse("2026-10-17T10:00:00.000Z");
  assert.equal(
    new Date(computeGameDayResetCloseAt(event)).toISOString(),
    "2026-10-16T00:00:00.000Z",
  );
});

test("cycle: registration opening is moved to previous matching weekday when equal to close", () => {
  const close = Date.parse("2026-10-16T00:00:00.000Z");
  const open = computeRegistrationOpenAt({
    closeAtMs: close,
    weekdayUtc: 5,
    timeUtc: "00:00",
  });

  assert.equal(new Date(open).toISOString(), "2026-10-09T00:00:00.000Z");
});

test("cycle: automatic schedule includes event duration and deterministic open/close dates", () => {
  const schedule = getAutomaticRegistrationCycleSchedule(
    {
      wastelandAnchorAt: "2026-10-03T10:00:00.000Z",
      wastelandIntervalDays: 14,
      wastelandDurationHours: 24,
      registrationCloseMode: "gameDayReset",
      registrationOpenWeekdayUtc: 5,
      registrationOpenTimeUtc: "00:00",
    },
    Date.parse("2026-10-09T00:00:00.000Z"),
  );

  assert.equal(schedule.eventStartAt, "2026-10-17T10:00:00.000Z");
  assert.equal(schedule.eventEndAt, "2026-10-18T10:00:00.000Z");
  assert.equal(schedule.opensAt, "2026-10-09T00:00:00.000Z");
  assert.equal(schedule.closesAt, "2026-10-16T00:00:00.000Z");
});

test("cycle: manual dates override automatic schedule", () => {
  const schedule = getRegistrationCycleSchedule(
    {
      cycleMode: "manual",
      manualOpensAt: "2026-10-08T01:00:00.000Z",
      manualClosesAt: "2026-10-15T02:00:00.000Z",
    },
    Date.parse("2026-10-09T00:00:00.000Z"),
  );

  assert.equal(schedule.opensAt, "2026-10-08T01:00:00.000Z");
  assert.equal(schedule.closesAt, "2026-10-15T02:00:00.000Z");
});

test("cycle: remaining-time formatter reports future and passed targets", () => {
  const now = Date.parse("2026-10-09T00:00:00.000Z");
  assert.deepEqual(
    formatRemainingTime("2026-10-10T02:30:00.000Z", now),
    { totalMs: 26.5 * HOUR, days: 1, hours: 2, minutes: 30, passed: false },
  );
  assert.equal(formatRemainingTime("2026-10-08T00:00:00.000Z", now).passed, true);
  assert.equal(formatRemainingTime("bad-date", now), null);
});

test("cycle: UTC datetime-local conversion round-trips", () => {
  const iso = "2026-10-17T10:30:00.000Z";
  const localValue = toUtcDateTimeLocalValue(iso);
  assert.equal(localValue, "2026-10-17T10:30");
  assert.equal(fromUtcDateTimeLocalValue(localValue), iso);
});

test("cycle admin: draft normalization and save patch preserve manual/automatic rules", () => {
  const defaults = getDefaultRegistrationCycleDraft();
  assert.equal(defaults.cycleMode, "automatic");
  assert.equal(getUtcTime("2026-10-17T10:30:00.000Z"), "10:30");

  const manualDraft = createRegistrationCycleDraft({
    cycleMode: "manual",
    manualOpensAt: "2026-10-08T00:00:00.000Z",
    manualClosesAt: "2026-10-16T00:00:00.000Z",
    autoOpenRegistration: false,
    autoCloseRegistration: false,
  });
  const patch = createRegistrationCycleSavePatch(manualDraft, {
    opensAt: manualDraft.manualOpensAt,
    closesAt: manualDraft.manualClosesAt,
    eventStartAt: "2026-10-17T10:00:00.000Z",
    eventEndAt: "2026-10-18T10:00:00.000Z",
  });

  assert.equal(patch.manualOpensAt, manualDraft.manualOpensAt);
  assert.equal(patch.autoOpenRegistration, false);
  assert.equal(patch.publicRegistration, true);
});
