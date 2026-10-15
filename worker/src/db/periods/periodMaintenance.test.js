import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupOldRegistrationPeriods,
  remapPeriodShifts,
} from "../periods.js";

function databaseWithShifts(rows) {
  const statements = [];
  const batches = [];

  return {
    statements,
    batches,
    DB: {
      prepare(sql) {
        const statement = {
          sql,
          bound: [],
          bind(...values) {
            this.bound = values;
            return this;
          },
          async all() {
            return { results: rows };
          },
        };
        statements.push(statement);
        return statement;
      },
      async batch(batch) {
        batches.push(batch);
      },
    },
  };
}

test("period maintenance: no disabled shifts requires no writes", async () => {
  const env = databaseWithShifts([{ shift: "shift1", count: 4 }]);
  await remapPeriodShifts(env, 8, {}, { shift1: true });
  assert.equal(env.batches.length, 0);
});

test("period maintenance: missing mapping stops before modifying registrations", async () => {
  const env = databaseWithShifts([{ shift: "shift2", count: 3 }]);
  await assert.rejects(
    remapPeriodShifts(env, 8, {}, { shift1: true, shift2: false }),
    /SHIFT_MAPPING_REQUIRED:shift2/,
  );
  assert.equal(env.batches.length, 0);
});

test("period maintenance: remapping updates private and public registrations together", async () => {
  const env = databaseWithShifts([{ shift: "shift2", count: 3 }]);
  await remapPeriodShifts(env, 8, { shift2: "shift1" }, { shift1: true });
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
  assert.deepEqual(env.batches[0][0].bound, ["shift1", 8, "shift2"]);
  assert.deepEqual(env.batches[0][1].bound, ["shift1", 8, "shift2"]);
  assert.match(env.batches[0][0].sql, /UPDATE registrations SET shift/);
  assert.match(env.batches[0][1].sql, /UPDATE public_players SET shift/);
});

test("period maintenance: no expired periods means no cleanup writes", async () => {
  const env = databaseWithShifts([]);
  assert.equal(await cleanupOldRegistrationPeriods(env, Date.now(), 14), 0);
  assert.equal(env.batches.length, 0);
});
