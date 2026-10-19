import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdminWorkingPeriod,
  getPublicDisplayPeriod,
} from "../worker/src/db/periods.js";
import { DEFAULT_REGISTRATION_CYCLE_SETTINGS } from "../shared/registrationConfig.js";
import { getRegistrationCycleSchedule } from "../shared/registrationCycle.js";
import { isAdminRosterPastDeadline } from "../src/pages/Admin/services/adminPlayersCache.js";

const ms = Date.parse;
const settings = DEFAULT_REGISTRATION_CYCLE_SETTINGS;
const oldSchedule = getRegistrationCycleSchedule(settings, ms("2026-10-16T12:00:00Z"));
const newSchedule = getRegistrationCycleSchedule(settings, ms("2026-10-19T00:00:00Z"));

function period(id, schedule) {
  return {
    id,
    cycle_key: `auto:${schedule.eventStartAt}`,
    created_at: schedule.opensAt,
    opens_at: schedule.opensAt,
    closes_at: schedule.closesAt,
    wasteland_start_at: schedule.eventStartAt,
    wasteland_end_at: schedule.eventEndAt,
    rules_snapshot_json: '{"initialized":true}',
    status: "closed",
  };
}

const previous = period(6, oldSchedule);
const future = { ...period(7, newSchedule), status: "open" };

function mockDb(periods) {
  const reads = [];
  const env = {
    DB: {
      prepare(rawSql) {
        const sql = rawSql.replace(/\s+/g, " ").trim();
        const make = (params = []) => ({
          bind(...values) { return make(values); },
          async first() {
            reads.push({ sql, params });
            if (sql.includes("FROM registration_cycle_resets")) return null;
            if (sql.includes("cycle_key = ?")) {
              return periods.find((p) => p.cycle_key === params[0]) ?? null;
            }
            if (sql.includes("wasteland_end_at > ?")) {
              return periods.filter((p) => p.wasteland_end_at > params[0] &&
                (!p.opens_at || p.opens_at <= params[1]))
                .sort((a, b) => b.wasteland_end_at.localeCompare(a.wasteland_end_at))[0] ?? null;
            }
            if (sql.includes("ORDER BY id DESC")) {
              throw new Error("Future-period latest-ID fallback must not be used");
            }
            throw new Error(`Unexpected D1 read: ${sql}`);
          },
          async run() { throw new Error("Rollover must not write D1 merely to read roster"); },
        });
        return make();
      },
    },
  };
  return { env, reads };
}

test("Stage 048: before Monday both admin and public use prior active roster even when a newer period exists", async () => {
  const { env } = mockDb([previous, future]);
  const sunday = ms("2026-10-18T23:59:59Z");
  assert.equal((await getAdminWorkingPeriod(env, settings, sunday))?.id, previous.id);
  assert.equal((await getPublicDisplayPeriod(env, settings, sunday))?.id, previous.id);
});

test("Stage 048: Monday 09:00 JST closes both rosters despite an already-created future period", async () => {
  const { env, reads } = mockDb([previous, future]);
  for (const at of ["2026-10-19T00:00:00Z", "2026-10-21T12:00:00Z", "2026-10-22T23:59:59Z"]) {
    assert.equal(await getAdminWorkingPeriod(env, settings, ms(at)), null, at);
    assert.equal(await getPublicDisplayPeriod(env, settings, ms(at)), null, at);
  }
  assert.ok(reads.every(({ sql }) => !sql.includes("ORDER BY id DESC")));
});

test("Stage 048: on Friday existing new period, if any, is selected by cycle key rather than latest ID", async () => {
  const { env } = mockDb([previous, future]);
  const friday = ms("2026-10-23T00:00:00Z");
  assert.equal((await getAdminWorkingPeriod(env, settings, friday))?.id, future.id);
  assert.equal((await getPublicDisplayPeriod(env, settings, friday))?.id, future.id);
  assert.notEqual(future.id, previous.id);
});

test("Stage 048: no old-period roster is resurrected when the next period was not created", async () => {
  const { env } = mockDb([previous]);
  assert.equal(await getAdminWorkingPeriod(env, settings, ms("2026-10-21T00:00:00Z")), null);
});


test("Stage 048: legacy cached rosters expire on Monday even without explicit wastelandEndAt", () => {
  const monday = ms("2026-10-19T00:00:00Z");
  assert.equal(isAdminRosterPastDeadline({
    cycleKey: previous.cycle_key,
    wastelandStartAt: previous.wasteland_start_at,
  }, monday - 1000), false);
  assert.equal(isAdminRosterPastDeadline({
    cycleKey: previous.cycle_key,
    wastelandStartAt: previous.wasteland_start_at,
  }, monday), true);
  assert.equal(isAdminRosterPastDeadline({ cycleKey: previous.cycle_key }, monday), true);
});
