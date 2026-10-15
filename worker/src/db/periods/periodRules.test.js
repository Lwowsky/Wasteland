import assert from "node:assert/strict";
import test from "node:test";

import {
  getEffectiveRegistrationSettings,
  getPeriodRules,
  updatePeriodRulesSnapshot,
} from "../periods.js";

// Import the original public API (periods.js), not the private implementation.
test("period rules: missing snapshot retains the configured fallback", () => {
  const fallback = { availableShifts: { shift1: true, shift2: false } };
  const result = getPeriodRules(null, fallback);
  assert.equal(result.availableShifts.shift1, true);
  assert.equal(result.availableShifts.shift2, false);
});

test("period rules: absent period preserves the settings reference", () => {
  const settings = { customValue: "keep" };
  assert.equal(getEffectiveRegistrationSettings(settings, null), settings);
});

test("period rules: missing period id does not issue DB writes", async () => {
  let accessedDb = false;
  const env = { DB: { prepare() { accessedDb = true; throw Error("Unexpected DB"); } } };
  assert.equal(await updatePeriodRulesSnapshot(env, null, {}), null);
  assert.equal(accessedDb, false);
});
