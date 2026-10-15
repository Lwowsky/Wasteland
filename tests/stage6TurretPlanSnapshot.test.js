import assert from "node:assert/strict";
import test from "node:test";

import {
  initialTurretPlanSettings,
  emptyTurretPlanSnapshot,
  serverTurretPlanSnapshot,
} from "../src/pages/Admin/turrets/turretPlanSnapshot.js";
import { DEFAULT_PLANNER_SETTINGS } from "../src/features/turrets/plannerSettings.js";

test("stage 6: initial turret settings preserve official plan language defaults", () => {
  const uk = initialTurretPlanSettings("uk");
  const en = initialTurretPlanSettings("en");
  assert.deepEqual(uk.planLanguages, ["uk", "en"]);
  assert.deepEqual(en.planLanguages, ["en"]);
  assert.equal(uk.maxHelpers, DEFAULT_PLANNER_SETTINGS.maxHelpers);
});

test("stage 6: empty snapshot has independent assignments on every invocation", () => {
  const first = emptyTurretPlanSnapshot("uk");
  const second = emptyTurretPlanSnapshot("uk");
  first.assignments.shifts.shift1.hub.captainId = "alice";
  assert.equal(second.assignments.shifts.shift1.hub.captainId, null);
  assert.equal(second.assignments.shifts.shift4.south.captainId, null);
});

test("stage 6: a missing server draft yields an empty snapshot with correct language", () => {
  const snapshot = serverTurretPlanSnapshot(null, "en");
  assert.equal(snapshot.assignments.shifts.shift2.east.captainId, null);
  assert.deepEqual(snapshot.settings.planLanguages, ["en"]);
});

test("stage 6: old two-shift server drafts gain shifts 3/4 without moving captains", () => {
  const original = {
    settings: { maxHelpers: 21, onlyCaptains: false },
    assignments: { shifts: { shift1: { hub: {
      captainId: "manual-captain", helperIds: ["helper"], helperMarches: { helper: 100 },
    } } } },
  };
  const unchanged = structuredClone(original);
  const result = serverTurretPlanSnapshot(original, "uk");
  assert.equal(result.settings.maxHelpers, 21);
  assert.deepEqual(result.settings.planLanguages, ["uk", "en"]);
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "manual-captain");
  assert.deepEqual(result.assignments.shifts.shift1.hub.helperIds, ["helper"]);
  assert.equal(result.assignments.shifts.shift4.east.captainId, null);
  assert.deepEqual(original, unchanged);
});

test("stage 6: explicit plan language choices from the server are preserved", () => {
  const result = serverTurretPlanSnapshot({
    settings: { planLanguages: ["en"], shift1Limit: 500 },
    assignments: { shifts: {} },
  }, "uk");
  assert.deepEqual(result.settings.planLanguages, ["en"]);
  assert.equal(result.settings.shift1Limit, 100);
});
