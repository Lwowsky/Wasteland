import assert from "node:assert/strict";
import test from "node:test";

import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import {
  createEmptyAssignments, getHelperCandidates, toFinalPlanShape,
} from "../src/features/turrets/turretAssignments.js";
import { comparePlayersByTier, getTierRank } from "../src/features/turrets/tierPriority.js";
import { countAssignedInShift } from "../src/features/turrets/shiftCapacity.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { createPublicPlan, validateTurretDraft } from "../worker/src/turrets/validate.js";

const player = (id, tier, marchSize, overrides = {}) => ({
  id: String(id), nickname: `Player-${id}`, alliance: "SOURCE-A", shift: "shift1",
  captain: false, troopType: "fighter", tier, marchSize, rallySize: 0, ...overrides,
});
const captain = (id, rallySize = 2_000_000, shift = "shift1") =>
  player(id, "T12", 200_000, { captain: true, rallySize, shift });
const settings = (other = {}) => normalizePlannerSettings({
  onlyCaptains: true, mode: "balanced", ...other,
});
const distribute = (players, opts = {}) => runAutomaticDistribution({
  assignments: createEmptyAssignments(), players, settings: settings(), operation: "fill", ...opts,
});
const ids = (slot) => slot.helperIds.map(String);

function helpersInShift(assignments, shift = "shift1") {
  return Object.values(assignments.shifts[shift]).flatMap((slot) => slot.helperIds);
}

test("tier priority: 29 helper seats exclude every T9 when enough T10+ players exist", () => {
  const helperPlayers = [
    ...Array.from({ length: 8 }, (_, i) => player(i + 2, "T13", 100_000)),
    ...Array.from({ length: 10 }, (_, i) => player(i + 10, "T12", 100_000)),
    ...Array.from({ length: 8 }, (_, i) => player(i + 20, "T11", 100_000)),
    ...Array.from({ length: 6 }, (_, i) => player(i + 28, "T10", 100_000)),
    ...Array.from({ length: 3 }, (_, i) => player(i + 34, "T9", 900_000)),
  ];
  const players = [captain(1), ...helperPlayers];
  const result = distribute(players, { operation: "tower", shift: "shift1", tower: "hub" });
  const slot = result.assignments.shifts.shift1.hub;
  const roster = new Map(players.map((p) => [p.id, p]));
  const selectedTiers = ids(slot).map((id) => roster.get(id).tier);
  assert.equal(slot.helperIds.length, 29);
  assert.equal(selectedTiers.filter((tier) => tier === "T13").length, 8);
  assert.equal(selectedTiers.filter((tier) => tier === "T12").length, 10);
  assert.equal(selectedTiers.filter((tier) => tier === "T11").length, 8);
  assert.equal(selectedTiers.filter((tier) => tier === "T10").length, 3);
  assert.equal(selectedTiers.includes("T9"), false);
  assert.equal(result.stats.unassigned, 6);
  assert.equal(validateTurretDraft(settings(), result.assignments, players).count, 30);
});

test("tier priority: across different original alliances, lower tiers cannot preempt higher tiers", () => {
  const players = [captain(1),
    ...Array.from({ length: 29 }, (_, i) => player(i + 2, "T14", 40_000,
      { alliance: "HIGH-TIER-ALLIANCE" })),
    ...Array.from({ length: 30 }, (_, i) => player(i + 31, "T9", 800_000,
      { alliance: `LOW-${i % 10}` })),
  ];
  const result = distribute(players, { operation: "tower", shift: "shift1", tower: "hub" });
  const chosen = new Set(ids(result.assignments.shifts.shift1.hub));
  assert.ok(players.slice(1, 30).every((p) => chosen.has(p.id)));
  assert.ok(players.slice(30).every((p) => !chosen.has(p.id)));
});

test("tier priority: among equal tiers, actual higher march wins even in balanced mode", () => {
  const candidates = Array.from({ length: 35 }, (_, i) => player(i + 2, "T11", 5_000 + i * 100,
    { alliance: `ORIGIN-${i % 7}` }));
  const players = [captain(1), ...candidates];
  const result = distribute(players, { operation: "tower", shift: "shift1", tower: "hub" });
  const selected = new Set(ids(result.assignments.shifts.shift1.hub));
  const descending = [...candidates].sort(comparePlayersByTier);
  assert.deepEqual([...selected].sort(), descending.slice(0, 29).map((p) => p.id).sort());
  assert.equal(getTierRank({ tier: "T14" }), 14);
  assert.equal(getTierRank({ tier: "bad" }), 0);
});

test("tier priority: same tier/march uses stable ID regardless of incoming registration order", () => {
  const helpers = Array.from({ length: 36 }, (_, i) => player(i + 2, "T12", 150_000,
    { alliance: `TEAM-${i % 2}` }));
  const players = [captain(1), ...helpers];
  const opts = { operation: "tower", shift: "shift1", tower: "hub" };
  const first = distribute(players, opts);
  const second = distribute([...players].reverse(), opts);
  assert.deepEqual(first.assignments, second.assignments);
  assert.equal(first.assignments.shifts.shift1.hub.helperIds.length, 29);
});

test("tier priority: shared 100-seat shift capacity reserves T9 before T14", () => {
  const players = [
    ...Array.from({ length: 5 }, (_, i) => captain(i + 1)),
    ...Array.from({ length: 95 }, (_, i) => player(i + 6, "T14", 70_000)),
    ...Array.from({ length: 35 }, (_, i) => player(i + 101, "T9", 300_000)),
  ];
  const config = settings();
  const result = distribute(players, { settings: config });
  const assigned = new Set(helpersInShift(result.assignments));
  assert.equal(countAssignedInShift(result.assignments, "shift1"), 100);
  assert.equal(result.stats.unassigned, 35);
  assert.ok(players.slice(5, 100).every((p) => assigned.has(p.id)));
  assert.ok(players.slice(100).every((p) => !assigned.has(p.id)));
  validateTurretDraft(config, result.assignments, players);
});

test("tier priority: top-up preserves existing manual seats while giving the next open seat to highest tier", () => {
  const players = [captain(1), player(2, "T9", 80_000), player(3, "T14", 15_000),
    player(4, "T11", 120_000)];
  const previous = createEmptyAssignments();
  previous.shifts.shift1.hub = { captainId: "1", helperIds: ["2"], helperMarches: { "2": 222 } };
  const config = settings({ allianceLimits: true, shift1Limit: 3 });
  const next = distribute(players, { assignments: previous, settings: config });
  assert.deepEqual(next.assignments.shifts.shift1.hub.helperIds, ["2", "3"]);
  assert.equal(next.assignments.shifts.shift1.hub.helperMarches["2"], 222);
  assert.equal(helpersInShift(next.assignments).includes("4"), false);
});

test("tier priority: manual candidate list and final-plan data share the same sorting rule", () => {
  const players = [captain(1), player(2, "T9", 250_000), player(3, "T14", 70_000),
    player(4, "T11", 150_000), player(5, "T11", 200_000)];
  const draft = createEmptyAssignments();
  draft.shifts.shift1.hub.captainId = "1";
  assert.deepEqual(getHelperCandidates(draft, players, "shift1", "hub", settings())
    .map((p) => p.id), ["3", "5", "4", "2"]);
  draft.shifts.shift1.hub.helperIds = ["2", "4", "3", "5"];
  draft.shifts.shift1.hub.helperMarches = { "2": 2000, "4": 5000, "3": 1000, "5": 9000 };
  const copy = structuredClone(draft);
  const shaped = toFinalPlanShape(draft, players, "shift1", settings());
  assert.deepEqual(shaped.hub.players.map((p) => p.id), ["3", "5", "4", "2"]);
  assert.deepEqual(draft, copy, "display sorting must not change saved helper IDs or marches");
  const publicPlan = createPublicPlan(draft, players, ["shift1"]);
  assert.deepEqual(publicPlan.shift1.hub.players.map((p) => p.tier), ["T14", "T11", "T11", "T9"]);
  assert.deepEqual(publicPlan.shift1.hub.players.map((p) => p.marchSize), [1000, 9000, 5000, 2000]);
});

test("tier priority: a different troop type remains in reserve despite a higher tier", () => {
  const players = [captain(1), player(2, "T14", 100_000, { troopType: "shooter" }),
    player(3, "T10", 30_000, { troopType: "fighter" })];
  const result = distribute(players);
  assert.deepEqual(result.assignments.shifts.shift1.hub.helperIds, ["3"]);
});

test("tier priority: redistribution replaces lower-tier helpers, never the captain", () => {
  const players = [captain(1), player(2, "T9", 400_000), player(3, "T10", 300_000),
    player(4, "T14", 50_000), player(5, "T13", 70_000)];
  const previous = createEmptyAssignments();
  previous.shifts.shift1.hub = { captainId: "1", helperIds: ["2", "3"],
    helperMarches: { "2": 100_000, "3": 100_000 } };
  const config = settings({ allianceLimits: true, shift1Limit: 3 });
  const result = distribute(players, { assignments: previous, settings: config,
    operation: "redistribute" });
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "1");
  assert.deepEqual(result.assignments.shifts.shift1.hub.helperIds, ["4", "5"]);
  assert.equal(result.stats.helpersReleased, 2);
  assert.equal(countAssignedInShift(result.assignments, "shift1"), 3);
  assert.deepEqual(previous.shifts.shift1.hub.helperIds, ["2", "3"]);
  validateTurretDraft(config, result.assignments, players);
});

test("tier priority: shift 3 and 4 use the same ranking rules", () => {
  const players = [captain(1, 1_000_000, "shift3"), captain(2, 1_000_000, "shift4"),
    player(3, "T9", 200_000, { shift: "shift3" }),
    player(4, "T14", 40_000, { shift: "shift3" }),
    player(5, "T10", 100_000, { shift: "shift4" }),
    player(6, "T13", 40_000, { shift: "shift4" })];
  const config = settings({ allianceLimits: true, shift3Limit: 2, shift4Limit: 2 });
  const result = distribute(players, { settings: config, activeShifts: ["shift3", "shift4"] });
  assert.deepEqual(result.assignments.shifts.shift3.hub.helperIds, ["4"]);
  assert.deepEqual(result.assignments.shifts.shift4.hub.helperIds, ["6"]);
  validateTurretDraft(config, result.assignments, players);
});
