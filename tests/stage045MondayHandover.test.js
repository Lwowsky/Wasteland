import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicCycleCloseAtMs,
  getPublicCycleViewState,
  getRegistrationCycleSchedule,
} from "../shared/registrationCycle.js";
import {
  getAdminWorkingPeriod,
  getPublicDisplayPeriod,
} from "../worker/src/db/periods.js";
import { isAdminRosterPastDeadline } from "../src/pages/Admin/services/adminPlayersCache.js";

const ms = Date.parse;
const settings = {
  cycleMode: "automatic",
  wastelandAnchorAt: "2026-10-03T10:00:00.000Z",
  wastelandIntervalDays: 14,
  registrationCloseMode: "gameDayReset",
  registrationOpenWeekdayUtc: 5,
  registrationOpenTimeUtc: "00:00",
};
const oldPeriod = {
  id: 14,
  status: "closed",
  cycle_key: "auto:2026-10-31T10:00:00.000Z",
  opens_at: "2026-10-23T00:00:00.000Z",
  closes_at: "2026-10-30T00:00:00.000Z",
  wasteland_start_at: "2026-10-31T10:00:00.000Z",
  wasteland_end_at: "2026-11-01T10:00:00.000Z",
};

function envWithLastPeriod(period = oldPeriod) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes("FROM registration_periods")) return period;
            return null;
          },
          async run() { throw new Error("Monday handover must not write D1"); },
        };
      },
    },
  };
}

test("Stage 045: Saturday 19:00 JST through Sunday 19:00 JST is the 24-hour Wasteland", () => {
  const schedule = getRegistrationCycleSchedule(settings, ms("2026-10-25T00:00:00Z"));
  assert.equal(schedule.eventStartAt, "2026-10-31T10:00:00.000Z");
  assert.equal(schedule.eventEndAt, "2026-11-01T10:00:00.000Z");
  assert.equal(new Date(getPublicCycleCloseAtMs(schedule.eventEndAtMs)).toISOString(), "2026-11-02T00:00:00.000Z");
});

test("Stage 045: admin and public pages retain same roster until Monday 08:59:59 JST", async () => {
  const env = envWithLastPeriod();
  for (const instant of ["2026-11-01T10:00:00Z", "2026-11-01T23:59:59Z"]) {
    assert.equal((await getAdminWorkingPeriod(env, settings, ms(instant)))?.id, oldPeriod.id, instant);
    assert.equal((await getPublicDisplayPeriod(env, settings, ms(instant)))?.id, oldPeriod.id, instant);
    assert.equal(getPublicCycleViewState(settings, ms(instant)).visible, true, instant);
  }
});

test("Stage 045: Monday 09:00 JST hides the old players and plan with no D1 deletes", async () => {
  const env = envWithLastPeriod();
  for (const instant of ["2026-11-02T00:00:00Z", "2026-11-03T12:00:00Z"]) {
    assert.equal(await getAdminWorkingPeriod(env, settings, ms(instant)), null, instant);
    assert.equal(await getPublicDisplayPeriod(env, settings, ms(instant)), null, instant);
    assert.equal(getPublicCycleViewState(settings, ms(instant)).visible, false, instant);
  }
  assert.equal(isAdminRosterPastDeadline({ wastelandEndAt: oldPeriod.wasteland_end_at }, ms("2026-11-01T23:59:59Z")), false);
  assert.equal(isAdminRosterPastDeadline({ wastelandEndAt: oldPeriod.wasteland_end_at }, ms("2026-11-02T00:00:00Z")), true);
});

test("Stage 045: new registration starts Friday 09:00 JST, not on Monday", () => {
  const thursday = ms("2026-11-05T23:59:59Z");
  const friday = ms("2026-11-06T00:00:00Z");
  assert.equal(getPublicCycleViewState(settings, thursday).visible, false);
  const result = getPublicCycleViewState(settings, friday);
  assert.equal(result.visible, true);
  assert.equal(result.eventStartAt, "2026-11-14T10:00:00.000Z");
  assert.equal(getRegistrationCycleSchedule(settings, friday).opensAt, "2026-11-06T00:00:00.000Z");
});

test("Stage 045: F5 cannot revive a cached admin roster after Monday or stale empty data after Friday", async () => {
  const { readAdminPlayersCache, writeAdminPlayersCache } = await import("../src/pages/Admin/services/adminPlayersCache.js");
  const originalWindow = globalThis.window;
  const data = new Map();
  globalThis.window = { sessionStorage: {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }};
  try {
    const sunday = ms("2026-11-01T23:59:00Z");
    writeAdminPlayersCache("owner", {
      players: [{ id: 1, nickname: "Old" }],
      period: { id: 14, wastelandEndAt: oldPeriod.wasteland_end_at }, cursor: 2,
    }, sunday);
    assert.equal(readAdminPlayersCache("owner", sunday)?.players.length, 1);
    assert.equal(readAdminPlayersCache("owner", ms("2026-11-02T00:00:00Z")), null);

    const thursday = ms("2026-11-05T23:59:55Z");
    writeAdminPlayersCache("owner", { players: [], period: null, cursor: 0,
      nextOpensAt: "2026-11-06T00:00:00.000Z" }, thursday);
    assert.equal(readAdminPlayersCache("owner", thursday)?.players.length, 0);
    assert.equal(readAdminPlayersCache("owner", ms("2026-11-06T00:00:00Z")), null);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
