import test from "node:test";
import assert from "node:assert/strict";

import { createEmptyAssignments, findAssignmentConflicts, locateAssignment } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import { compareRedistributedHelpers, releaseAllTurretHelpers } from "../src/features/turrets/turretRedistribution.js";
import { resolveTurretFeedback } from "../src/features/turrets/turretFeedback.js";
import uk from "../src/i18n/locales/uk/admin/distribution.json" with { type: "json" };
import en from "../src/i18n/locales/en/admin/distribution.json" with { type: "json" };

const player = (id, { shift = "shift1", captain = false, troopType = "fighter", rallySize = 200_000 } = {}) => ({
  id: String(id), nickname: `P${id}`, shift, captain, troopType,
  marchSize: 100_000, rallySize, tier: "T11", alliance: "A",
});
const settings = normalizePlannerSettings({ onlyCaptains: true, respectShift: true,
  sameTroopType: true, allowFlexible: false });

function initialPlan() {
  const a = createEmptyAssignments();
  a.shifts.shift1.hub.captainId = "1";
  a.shifts.shift1.hub.helperIds = ["2", "3"];
  a.shifts.shift1.hub.helperMarches = { "2": 100_000, "3": 100_000 };
  a.shifts.shift1.north.captainId = "4";
  a.shifts.shift2.hub.captainId = "5";
  a.shifts.shift2.hub.helperIds = ["6"];
  a.shifts.shift2.hub.helperMarches = { "6": 100_000 };
  return a;
}

test("releaseAllTurretHelpers clears both shifts, preserves captains, and does not mutate its input", () => {
  const original = initialPlan();
  const saved = structuredClone(original);
  const result = releaseAllTurretHelpers(original);
  assert.equal(result.released, 3);
  assert.deepEqual(original, saved);
  for (const shift of ["shift1", "shift2"]) {
    for (const slot of Object.values(result.assignments.shifts[shift])) {
      assert.deepEqual(slot.helperIds, []);
      assert.deepEqual(slot.helperMarches, {});
    }
  }
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "1");
  assert.equal(result.assignments.shifts.shift1.north.captainId, "4");
  assert.equal(result.assignments.shifts.shift2.hub.captainId, "5");
});

test("redistribution removes incompatible helpers and repopulates both shifts without mutating the old plan", () => {
  const rows = [
    player(1, { captain: true }), player(2, { troopType: "shooter" }),
    player(3), player(4, { captain: true }),
    player(5, { shift: "shift2", captain: true }),
    player(6, { shift: "shift1" }), // Invalid member of shift2
    player(7), player(8, { shift: "shift2" }),
  ];
  const original = initialPlan();
  const before = structuredClone(original);
  assert.ok(findAssignmentConflicts(original, rows, settings).length >= 2);
  const result = runAutomaticDistribution({ assignments: original, players: rows,
    settings, operation: "redistribute" });
  assert.equal(result.error, undefined);
  assert.equal(result.stats.helpersReleased, 3);
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "1");
  assert.equal(result.assignments.shifts.shift2.hub.captainId, "5");
  assert.deepEqual(original, before);
  assert.equal(locateAssignment(result.assignments, "2"), null); // Shooter excluded
  assert.equal(locateAssignment(result.assignments, "6")?.shift, "shift1");
  assert.equal(findAssignmentConflicts(result.assignments, rows, settings).length, 0);
});

test("deterministic redistributions may legitimately place the same helpers in the same turret", () => {
  const rows = [player(1, { captain: true }), player(2), player(3)];
  const first = runAutomaticDistribution({ assignments: createEmptyAssignments(),
    players: rows, settings, operation: "fill" });
  const next = runAutomaticDistribution({ assignments: first.assignments,
    players: rows, settings, operation: "redistribute" });
  assert.equal(next.stats.helpersReleased, 2);
  assert.equal(next.stats.helpersAdded, 2);
  assert.equal(next.stats.helpersSameTurret, 2);
  assert.equal(next.stats.helpersMoved, 0);
  assert.equal(next.stats.changed, false);
  assert.deepEqual(next.assignments, first.assignments);
});

test("compareRedistributedHelpers differentiates moves, reserve, and unchanged seats", () => {
  const before = initialPlan();
  const after = createEmptyAssignments();
  after.shifts.shift1.hub.helperIds = ["2", "10"];
  after.shifts.shift1.north.helperIds = ["3"];
  assert.deepEqual(compareRedistributedHelpers(before, after), {
    helpersMoved: 1, helpersSameTurret: 1,
    helpersNewFromReserve: 1, helpersToReserve: 1,
  });
});

test("redistribution and clear feedback resolve in both languages, without raw tokens", () => {
  for (const distribution of [uk, en]) {
    for (const key of ["autoRedistributed", "autoRedistributedIssues", "helpersCleared", "helpersAlreadyEmpty"]) {
      const result = resolveTurretFeedback(distribution, key, {
        helpersReleased: 4, helpersAdded: 3, helpersMoved: 2, helpersSameTurret: 1,
        helpersToReserve: 1, remainingConflicts: 1,
      });
      assert.ok(result.length > 0);
      assert.doesNotMatch(result, /\{\{/);
    }
  }
});

test("an invalid captain survives redistribution for explicit manual correction", () => {
  const rows = [player(1, { captain: false }), player(2), player(3)];
  const prior = createEmptyAssignments();
  prior.shifts.shift1.hub.captainId = "1";
  prior.shifts.shift1.hub.helperIds = ["2"];
  prior.shifts.shift1.hub.helperMarches = { "2": 100_000 };
  const result = runAutomaticDistribution({ assignments: prior, players: rows,
    settings, operation: "redistribute" });
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "1");
  assert.ok(findAssignmentConflicts(result.assignments, rows, settings)
    .some((item) => item.reason === "captain"));
});

test("clear-only remains safe and idempotent when all helpers are already in reserve", () => {
  const before = createEmptyAssignments();
  before.shifts.shift1.hub.captainId = "1";
  const first = releaseAllTurretHelpers(before);
  const second = releaseAllTurretHelpers(first.assignments);
  assert.equal(first.released, 0);
  assert.equal(second.released, 0);
  assert.deepEqual(second.assignments, before);
});
