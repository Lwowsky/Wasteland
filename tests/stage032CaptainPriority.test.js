import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createEmptyAssignments, normalizeAssignments } from "../src/features/turrets/turretAssignments.js";
import { restorePlannerFlexibleShifts } from "../src/features/turrets/plannerShiftOverrides.js";

const roster = [
  { id: "1", marchSize: 600, rallySize: 1500 },
  { id: "2", marchSize: 500, rallySize: 1500 },
  { id: "3", marchSize: 300, rallySize: 0 },
];

test("032: captain always wins over stale helper assignment in earlier turret", () => {
  const plan = createEmptyAssignments();
  plan.shifts.shift1.hub.captainId = "1";
  plan.shifts.shift1.hub.helperIds = ["2", "3"];
  plan.shifts.shift1.hub.helperMarches = { "2": 500, "3": 300 };
  plan.shifts.shift4.north.captainId = "2";
  const original = structuredClone(plan);
  const normalized = normalizeAssignments(plan, roster);
  assert.equal(normalized.shifts.shift4.north.captainId, "2");
  assert.deepEqual(normalized.shifts.shift1.hub.helperIds, ["3"]);
  assert.deepEqual(plan, original);
});

test("032: missing captain stays manually assigned after normalization", () => {
  const plan = createEmptyAssignments();
  plan.shifts.shift3.hub.captainId = "removed-registration";
  assert.equal(normalizeAssignments(plan, roster).shifts.shift3.hub.captainId, "removed-registration");
});

test("032: restoring free players does not alter manually occupied shifts", () => {
  const plan = createEmptyAssignments();
  plan.shifts.shift2.hub.captainId = "2";
  const result = restorePlannerFlexibleShifts({ shiftOverrides: { "2": "shift2", "3": "shift1" } }, plan);
  assert.deepEqual(result, { shiftOverrides: { "2": "shift2" }, restored: 1, kept: 1 });
  assert.equal(plan.shifts.shift2.hub.captainId, "2");
});

test("032: restore action changes only shift overrides, not custom capacity settings", () => {
  const source = readFileSync(new URL("../src/pages/Admin/turrets/useTurretPlan.js", import.meta.url), "utf8");
  const restoreAction = source.match(/function restoreFlexible\(\) \{([\s\S]*?)\n {2}\}/)?.[1];
  assert.ok(restoreAction);
  assert.match(restoreAction, /shiftOverrides: result\.shiftOverrides/);
  assert.doesNotMatch(restoreAction, /allianceLimits|shift[1-4](?:Limit|Extra)/);
});
