import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAssignments, locateAssignment } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { applyPlannerShiftOverrides, getAvailableFlexiblePlayers, restorePlannerFlexibleShifts } from "../src/features/turrets/plannerShiftOverrides.js";
import { PLANNER_SHIFTS } from "../src/features/turrets/plannerConstants.js";

const players = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1),
  shift: "flexible", nickname: `Player ${i + 1}`, tier: "T14", marchSize: 100000,
  rallySize: 1000000, troopType: "fighter" }));
const overrides = Object.fromEntries(players.map((p, i) => [p.id, PLANNER_SHIFTS[i % 4]]));

test("032: restore releases only free assigned-shift overrides and preserves captains and helpers", () => {
  const draft = createEmptyAssignments();
  draft.shifts.shift1.hub.captainId = "1";
  draft.shifts.shift2.hub.captainId = "2";
  draft.shifts.shift2.hub.helperIds = ["6"];
  draft.shifts.shift2.hub.helperMarches = { "6": 100000 };
  draft.shifts.shift3.hub.captainId = "3";
  draft.shifts.shift4.hub.captainId = "4";
  const before = structuredClone(draft);
  const settings = normalizePlannerSettings({ shiftOverrides: overrides });
  const result = restorePlannerFlexibleShifts(settings, draft);
  assert.deepEqual(result, {
    shiftOverrides: { "1": "shift1", "2": "shift2", "3": "shift3", "4": "shift4", "6": "shift2" },
    restored: 7, kept: 5,
  });
  assert.deepEqual(draft, before);
  assert.deepEqual(settings.shiftOverrides, overrides);
  const updated = applyPlannerShiftOverrides(players, result.shiftOverrides);
  assert.equal(getAvailableFlexiblePlayers(players, { shiftOverrides: result.shiftOverrides }, draft).length, 7);
  for (const id of ["1", "2", "3", "4", "6"]) {
    assert.ok(locateAssignment(draft, id));
    assert.notEqual(updated.find((p) => p.id === id).shift, "flexible");
  }
  for (const id of ["5", "7", "8", "9", "10", "11", "12"]) {
    assert.equal(updated.find((p) => p.id === id).shift, "flexible");
  }
});

test("032: no assigned overrides returns all moved players", () => {
  const result = restorePlannerFlexibleShifts({ shiftOverrides: overrides }, createEmptyAssignments());
  assert.deepEqual(result, { shiftOverrides: {}, restored: 12, kept: 0 });
});

test("032: no overrides and all selected captains is safe and idempotent", () => {
  const draft = createEmptyAssignments();
  draft.shifts.shift1.hub.captainId = "1";
  let result = restorePlannerFlexibleShifts({ shiftOverrides: { "1": "shift1" } }, draft);
  assert.deepEqual(result, { shiftOverrides: { "1": "shift1" }, restored: 0, kept: 1 });
  result = restorePlannerFlexibleShifts({ shiftOverrides: result.shiftOverrides }, draft);
  assert.deepEqual(result, { shiftOverrides: { "1": "shift1" }, restored: 0, kept: 1 });
  assert.deepEqual(restorePlannerFlexibleShifts({ shiftOverrides: {} }, draft),
    { shiftOverrides: {}, restored: 0, kept: 0 });
});

test("032: restore does not edit registration availability", () => {
  const original = structuredClone(players);
  const outcome = restorePlannerFlexibleShifts({ shiftOverrides: overrides }, createEmptyAssignments());
  applyPlannerShiftOverrides(players, outcome.shiftOverrides);
  assert.deepEqual(players, original);
});

test("032: shift action feedback is translated and reaches the result modal", async () => {
  const { readFileSync } = await import("node:fs");
  const root = new URL("../", import.meta.url);
  const read = (relative) => readFileSync(new URL(relative, root), "utf8");
  for (const locale of ["uk", "en"]) {
    const dict = JSON.parse(read(`src/i18n/locales/${locale}/admin/distribution.json`));
    for (const key of ["restoredDetails", "restoredNoPlayers", "appliedCount", "dismiss", "acknowledge", "successTitle", "infoTitle", "errorTitle"]) {
      assert.equal(typeof dict.limits.feedback[key], "string");
    }
  }
  assert.match(read("src/pages/Admin/turrets/FlexibleShiftSettings.jsx"), /onActionFeedback\?\.\(/);
  assert.match(read("src/pages/Admin/turrets/TurretDistributionCycle.jsx"), /<TurretActionResultModal\b/);
  assert.match(read("src/pages/Admin/turrets/TurretActionResultModal.jsx"), /<Modal\b/);
  assert.match(read("src/pages/Admin/turrets/DistributionSettings.jsx"), /onActionFeedback=\{onActionFeedback\}/);
});
