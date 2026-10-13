import assert from "node:assert/strict";
import { test } from "node:test";

import { TIER_DEFAULTS, TURRET_IDS } from "../src/features/turrets/plannerConstants.js";
import { getPlannerShift, summarizePlannerPlayers } from "../src/features/turrets/plannerPlayers.js";
import { DEFAULT_PLANNER_SETTINGS, normalizePlannerSettings, updatePlannerSettings } from "../src/features/turrets/plannerSettings.js";

test("turrets: identifiers match the old five-tower model", () => {
  assert.deepEqual(TURRET_IDS, ["hub", "north", "west", "east", "south"]);
  assert.equal(TIER_DEFAULTS.T14, 300000);
  assert.equal(TIER_DEFAULTS.T7, 40000);
});

test("turrets: counts reflect real registration shift and troop fields, not mock assignments", () => {
  const stats = summarizePlannerPlayers([
    { id: "1", shift: "shift1", troopType: "fighter", captain: true },
    { id: "2", shift: "shift2", troopType: "shooter", captain: false },
    { id: "3", shift: "flexible", troopType: "rider" },
    { id: "4", shift: "shift3", troopType: "fighter" },
    { id: "5", shift: "???", troopType: "fighter" },
  ]);
  assert.equal(stats.total, 5);
  assert.equal(stats.shift1, 1);
  assert.equal(stats.shift2, 1);
  assert.equal(stats.flexible, 1);
  assert.equal(stats.otherShifts, 1);
  assert.equal(stats.unknown, 1);
  assert.equal(stats.captains, 1);
  assert.deepEqual(stats.rolesByShift.shift1, { fighter: 1, rider: 0, shooter: 0 });
  assert.deepEqual(stats.rolesByShift.flexible, { fighter: 0, rider: 1, shooter: 0 });
  assert.deepEqual(stats.rolesByShift.total, { fighter: 3, rider: 1, shooter: 1 });
});

test("turrets: missing and unfamiliar shifts are never silently assigned to shift 1", () => {
  assert.equal(getPlannerShift({ shift: "shift1" }), "shift1");
  assert.equal(getPlannerShift({ shift: "both" }), "flexible");
  assert.equal(getPlannerShift({ shift: "shift4" }), "shift4");
  assert.equal(getPlannerShift({ shift: "" }), "unknown");
  assert.equal(summarizePlannerPlayers(null).total, 0);
});

test("turrets: normalize settings enforces defaults, booleans and numeric limits", () => {
  const result = normalizePlannerSettings({
    mode: "invalid", onlyCaptains: "false", respectShift: false,
    shift1Limit: 555, shift2Extra: -9,
    tierLimits: { T14: 420000, T13: "broken", T100: 123456 },
  });
  assert.equal(result.mode, "balanced");
  assert.equal(result.onlyCaptains, true);
  assert.equal(result.respectShift, false);
  assert.equal(result.shift1Limit, 100);
  assert.equal(result.shift2Extra, 0);
  assert.equal(result.tierLimits.T14, 420000);
  assert.equal(result.tierLimits.T13, 250000);
  assert.equal(result.tierLimits.T100, undefined);
  assert.notEqual(result.tierLimits, TIER_DEFAULTS);
});

test("turrets: editing a tier limit does not mutate shared defaults", () => {
  const original = normalizePlannerSettings(DEFAULT_PLANNER_SETTINGS);
  const edited = updatePlannerSettings(original, "T12", 255000);
  assert.equal(original.tierLimits.T12, 200000);
  assert.equal(edited.tierLimits.T12, 255000);
  assert.equal(TIER_DEFAULTS.T12, 200000);
});

