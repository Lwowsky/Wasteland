import assert from "node:assert/strict";
import { test } from "node:test";

import { getFinalPlanMetrics } from "../src/features/turrets/finalPlanMetrics.js";
import { filterPlayerStatus } from "../src/features/turrets/playerStatusFilters.js";
import { toFinalPlanShape, createEmptyAssignments } from "../src/features/turrets/turretAssignments.js";
import { createPublicPlan } from "../worker/src/turrets/validate.js";

const captain = { id: "c", nickname: "Cap", alliance: "A", tier: "T13",
  troopType: "fighter", shift: "shift1", marchSize: 473000, rallySize: 2575000 };
const helpers = [
  { id: "h1", nickname: "High", alliance: "B", tier: "T12", troopType: "fighter", shift: "shift1", marchSize: 600000 },
  { id: "h2", nickname: "Low", alliance: "C", tier: "T9", troopType: "fighter", shift: "shift2", marchSize: 90000 },
];
const roster = [captain, ...helpers];
function sample() {
  const assignments = createEmptyAssignments();
  assignments.shifts.shift1.hub.captainId = "c";
  assignments.shifts.shift1.hub.helperIds = ["h2", "h1"];
  assignments.shifts.shift1.hub.helperMarches = { h1: 150000, h2: 50000 };
  return assignments;
}

test("final plan: blue is captain march plus rally, green all assigned marches, gold free space", () => {
  const totals = getFinalPlanMetrics({ captain, players: [
    { marchSize: 150000 }, { marchSize: 50000 },
  ] });
  assert.deepEqual(totals, {
    capacity: 3048000, used: 673000, remaining: 2375000,
    captainMarch: 473000, helpersMarch: 200000,
  });
});

test("final plan: zero capacity when there is no captain", () => {
  assert.deepEqual(getFinalPlanMetrics(null), {
    capacity: 0, used: 0, remaining: 0, captainMarch: 0, helpersMarch: 0,
  });
});

test("final plan: older public snapshots without rally show unknown capacity rather than invented values", () => {
  const totals = getFinalPlanMetrics({ captain: { marchSize: 473000 }, players: [{ marchSize: 100000 }] });
  assert.equal(totals.capacity, null);
  assert.equal(totals.remaining, null);
  assert.equal(totals.used, 573000);
});

test("final plan: same totals for local admin preview and published whitelisted snapshot", () => {
  const assignments = sample();
  const admin = toFinalPlanShape(assignments, roster, "shift1", {});
  const published = createPublicPlan(assignments, roster, ["shift1"]).shift1;
  const adminNumbers = getFinalPlanMetrics(admin.hub);
  const publicNumbers = getFinalPlanMetrics(published.hub);
  assert.equal(adminNumbers.capacity, publicNumbers.capacity);
  assert.equal(adminNumbers.used, publicNumbers.used);
  assert.equal(adminNumbers.remaining, publicNumbers.remaining);
  assert.equal(published.hub.captain.rallySize, 2575000);
  assert.equal(published.hub.captain.secretEmail, undefined);
});

test("player status: shift filter uses assigned shift and reserve uses original shift", () => {
  const assignments = sample();
  assert.deepEqual(filterPlayerStatus(roster, assignments, { shift: "shift1", status: "turrets" })
    .map((row) => row.player.id), ["c", "h1", "h2"]);
  assert.equal(filterPlayerStatus(roster, assignments, { shift: "shift2", status: "turrets" }).length, 0);
  assert.deepEqual(filterPlayerStatus(roster, assignments, { search: "high" })
    .map((row) => row.player.id), ["h1"]);
});

test("player status: filter never alters the assignments", () => {
  const assignments = sample();
  const before = JSON.stringify(assignments);
  filterPlayerStatus(roster, assignments, { status: "reserve", search: "A" });
  assert.equal(JSON.stringify(assignments), before);
});
