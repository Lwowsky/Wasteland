import test from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_POST_WASTELAND_HOURS,
  getPublicDisplayPeriod,
  isPublicDisplayPeriodVisible,
} from "../worker/src/db/periods.js";
import {
  getPublicVisibilityKey,
  syncPublicVisibilityRevision,
} from "../worker/src/services/publicSnapshotSync.js";

const period = {
  id: 10,
  cycle_key: "auto:2026-10-17T10:00:00.000Z",
  status: "closed",
  opens_at: "2026-10-09T00:00:00.000Z",
  closes_at: "2026-10-16T00:00:00.000Z",
  wasteland_start_at: "2026-10-17T10:00:00.000Z",
  wasteland_end_at: "2026-10-18T10:00:00.000Z",
  rules_snapshot_json: '{"version":1}',
};

function fixture() {
  const state = { revision: 1, visible_period_key: "" };
  const env = {
    DB: {
      prepare(sql) {
        const statement = {
          bind(...values) { this.values = values; return this; },
          async first() {
            if (sql.includes("FROM registration_settings")) return null;
            if (sql.includes("FROM registration_periods")) return period;
            return null;
          },
          async all() { return { results: [] }; },
          async run() {
            if (sql.includes("SET visible_period_key = ?")) {
              const key = this.values[0];
              if (state.visible_period_key !== key) {
                state.visible_period_key = key;
                state.revision += 1;
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            }
            return { meta: { changes: 0 } };
          },
        };
        return statement;
      },
    },
  };
  return { env, state };
}

const at = (iso) => Date.parse(iso);

test("Stage 8 retention: registration closing does not hide the public players", async () => {
  const { env } = fixture();
  assert.equal(PUBLIC_POST_WASTELAND_HOURS, 24);
  const settings = {cycleMode: "automatic"};
  const publicPeriod = await getPublicDisplayPeriod(env, settings, at("2026-10-16T01:00:00Z"));
  assert.equal(publicPeriod.id, period.id);
  assert.equal(isPublicDisplayPeriodVisible(publicPeriod, at("2026-10-16T01:00:00Z")), true);
});

test("Stage 8 retention: shows current cycle during Wasteland and through 23:59:59 after it", async () => {
  const { env } = fixture();
  const settings = {cycleMode: "automatic"};
  for (const time of ["2026-10-17T10:01:00Z", "2026-10-18T10:00:00Z", "2026-10-19T09:59:59Z"]) {
    assert.equal((await getPublicDisplayPeriod(env, settings, at(time)))?.id, period.id, time);
  }
  assert.equal(await getPublicDisplayPeriod(env, settings, at("2026-10-19T10:00:00Z")), null);
});

test("Stage 8 retention: cron bumps JSON version only on visible-period transitions", async () => {
  const { env, state } = fixture();
  assert.equal(getPublicVisibilityKey(period), `${period.id}:${period.wasteland_end_at}`);
  assert.equal(await syncPublicVisibilityRevision(env, at("2026-10-16T01:00:00Z")), true);
  assert.equal(state.revision, 2);
  assert.equal(await syncPublicVisibilityRevision(env, at("2026-10-18T10:00:00Z")), false);
  assert.equal(state.revision, 2);
  assert.equal(await syncPublicVisibilityRevision(env, at("2026-10-19T10:00:00Z")), true);
  assert.equal(state.visible_period_key, "none");
  assert.equal(state.revision, 3);
  assert.equal(await syncPublicVisibilityRevision(env, at("2026-10-19T10:01:00Z")), false);
  assert.equal(state.revision, 3);
});
