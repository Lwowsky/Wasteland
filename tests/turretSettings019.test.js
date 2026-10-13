import assert from "node:assert/strict";
import { test } from "node:test";

import { createEmptyAssignments } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import {
  addPlannerFlexibleShifts, applyPlannerShiftOverrides, getAvailableFlexiblePlayers,
  invalidPlannerShiftOverrideIds, restorePlannerFlexibleShifts,
} from "../src/features/turrets/plannerShiftOverrides.js";
import { summarizePlannerPlayers } from "../src/features/turrets/plannerPlayers.js";
import { validateTurretDraft, PlanError } from "../worker/src/turrets/validate.js";

const registrations = [
  { id: "1", nickname: "First", shift: "shift1", captain: true, troopType: "fighter", tier: "T14", marchSize: 200000, rallySize: 400000 },
  { id: "2", nickname: "FlexB", shift: "flexible", captain: false, troopType: "fighter", tier: "T12", marchSize: 150000, rallySize: 300000 },
  { id: "3", nickname: "FlexA", shift: "both", captain: false, troopType: "fighter", tier: "T12", marchSize: 190000, rallySize: 300000 },
  { id: "4", nickname: "ShiftTwo", shift: "shift2", captain: true, troopType: "rider", tier: "T11", marchSize: 110000, rallySize: 270000 },
  { id: "5", nickname: "FlexC", shift: "flexible", captain: true, troopType: "rider", tier: "T11", marchSize: 80000, rallySize: 200000 },
];

test("stage 019: moving both-shift players only changes effective turret roster", () => {
  const assignments = createEmptyAssignments();
  const settings = normalizePlannerSettings({});
  const original = JSON.stringify(registrations);
  const result = addPlannerFlexibleShifts(registrations, settings, assignments, 1, 2);
  assert.deepEqual({ added1: result.added1, added2: result.added2 }, { added1: 1, added2: 2 });
  assert.deepEqual(result.shiftOverrides, { "3": "shift1", "2": "shift2", "5": "shift2" });
  const effective = applyPlannerShiftOverrides(registrations, result.shiftOverrides);
  assert.equal(JSON.stringify(registrations), original);
  assert.equal(registrations[2].shift, "both");
  assert.equal(effective.find((p) => p.id === "3").shift, "shift1");
  assert.deepEqual([summarizePlannerPlayers(registrations).flexible, summarizePlannerPlayers(effective).flexible], [3, 0]);
  assert.equal(getAvailableFlexiblePlayers(registrations, { shiftOverrides: result.shiftOverrides }, assignments).length, 0);
});

test("stage 019: only available unassigned flexible registrations may be moved", () => {
  const assignments = createEmptyAssignments();
  assignments.shifts.shift1.hub.captainId = "1";
  assignments.shifts.shift1.hub.helperIds = ["3"];
  assignments.shifts.shift1.hub.helperMarches = { "3": 190000 };
  const request = addPlannerFlexibleShifts(registrations, {}, assignments, 2, 1);
  assert.equal(request.error, "notEnoughFlexible");
  assert.deepEqual(addPlannerFlexibleShifts(registrations, {}, assignments, 1, 1).shiftOverrides,
    { "2": "shift1", "5": "shift2" });
  assert.deepEqual(addPlannerFlexibleShifts(registrations, {}, assignments, -1, 1), { error: "invalidCount" });
});

test("stage 019: restore removes only turret overrides, never registrations", () => {
  const assignments = createEmptyAssignments();
  const settings = normalizePlannerSettings({ shiftOverrides: { "3": "shift2" } });
  assert.deepEqual(restorePlannerFlexibleShifts(settings, assignments), { shiftOverrides: {}, restored: 1, kept: 0 });
  assignments.shifts.shift2.hub.captainId = "3";
  assert.deepEqual(restorePlannerFlexibleShifts(settings, assignments), {
    shiftOverrides: { "3": "shift2" }, restored: 0, kept: 1,
  });
  assert.equal(registrations[2].shift, "both");
});

test("stage 019: corrupt overrides cannot modify normal shift players", () => {
  assert.deepEqual(normalizePlannerSettings({ shiftOverrides: { "1": "shift2", "2": "shift1", hello: "shift2" } }).shiftOverrides,
    { "1": "shift2", "2": "shift1" });
  assert.deepEqual(invalidPlannerShiftOverrideIds({ "1": "shift2", "2": "shift1" }, registrations), ["1"]);
  assert.equal(applyPlannerShiftOverrides(registrations, { "1": "shift2" })[0].shift, "shift1");
});

test("stage 019: worker validates draft overrides and original player availability", () => {
  const assignments = createEmptyAssignments();
  assignments.shifts.shift2.hub.captainId = "5";
  const good = validateTurretDraft({ shiftOverrides: { "5": "shift2" } }, assignments, registrations);
  assert.equal(good.settings.shiftOverrides["5"], "shift2");
  assert.equal(registrations[4].shift, "flexible");
  assert.throws(() => validateTurretDraft({}, assignments, registrations), (e) =>
    e instanceof PlanError && e.message === "INVALID_TURRET_CAPTAIN");
  assert.throws(() => validateTurretDraft({ shiftOverrides: { "1": "shift2" } }, createEmptyAssignments(), registrations), (e) =>
    e instanceof PlanError && e.message === "INVALID_TURRET_SHIFT_OVERRIDE");
  assert.throws(() => validateTurretDraft({ shiftOverrides: { "9999": "shift1" } }, createEmptyAssignments(), registrations), (e) =>
    e instanceof PlanError && e.message === "INVALID_TURRET_SHIFT_OVERRIDE");
});

test("stage 019: custom caps stay disabled until explicitly enabled", () => {
  const configured = normalizePlannerSettings({ tierLimits: { T4: 25000 } });
  assert.equal(configured.tierLimits.T4, 25000);
  assert.equal(configured.tierLimitsEnabled, false);
  assert.equal(normalizePlannerSettings({ tierLimitsEnabled: false, tierLimits: { T12: 230000 } }).tierLimits.T12, 230000);
});
