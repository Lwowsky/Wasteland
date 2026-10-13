import assert from "node:assert/strict";
import test from "node:test";

import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import { createEmptyAssignments, locateAssignment } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { validateTurretDraft } from "../worker/src/turrets/validate.js";

const settings = normalizePlannerSettings(null);
const player = (id, shift, captain, troopType = "fighter", marchSize = 600, rallySize = 2500, tier = "T12") => ({
  id: String(id), nickname: `Player-${id}`, alliance: "AAA", shift, captain,
  troopType, marchSize, rallySize: captain ? rallySize : 0, tier,
});

function roster() {
  return [
    ...Array.from({ length: 5 }, (_, i) => player(i + 1, "shift1", true, "fighter", 650, 2500)),
    ...Array.from({ length: 5 }, (_, i) => player(i + 6, "shift2", true, "fighter", 700, 2300)),
    ...Array.from({ length: 55 }, (_, i) => player(i + 11, "shift1", false, "fighter", 250, 0)),
    ...Array.from({ length: 55 }, (_, i) => player(i + 66, "shift2", false, "fighter", 300, 0)),
  ];
}

const auto = (players, opts = {}) => runAutomaticDistribution({
  assignments: createEmptyAssignments(), players, settings, operation: "fill", ...opts,
});

test("auto: fills both shifts and all five turrets without reusing players", () => {
  const players = roster();
  const result = auto(players);
  assert.equal(result.error, undefined);
  assert.equal(result.stats.captainsAdded, 10);
  assert.ok(result.stats.helpersAdded >= 50);
  const used = [];
  for (const shift of ["shift1", "shift2"]) {
    for (const slot of Object.values(result.assignments.shifts[shift])) {
      assert.ok(slot.captainId);
      assert.ok(slot.helperIds.length > 0);
      assert.ok(slot.helperIds.length <= 29);
      used.push(slot.captainId, ...slot.helperIds);
      assert.ok(slot.helperIds.reduce((n, id) => n + slot.helperMarches[id], 0) <= 2500);
    }
  }
  assert.equal(used.length, new Set(used).size);
  assert.ok(used.every((id) => players.some((p) => p.id === id)));
  assert.equal(validateTurretDraft(settings, result.assignments, players).count, used.length);
});

test("auto: balanced distribution stays balanced and is deterministic for shuffled D1 results", () => {
  const players = roster();
  const result = auto(players);
  const other = auto([...players].reverse());
  assert.deepEqual(result.assignments, other.assignments);
  for (const shift of ["shift1", "shift2"]) {
    const counts = Object.values(result.assignments.shifts[shift]).map((s) => s.helperIds.length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, String(counts));
  }
});

test("auto: top-up preserves the captain, existing helper and manually chosen march", () => {
  const players = [player(1, "shift1", true), player(2, "shift1", false), player(3, "shift1", false)];
  const prior = createEmptyAssignments();
  prior.shifts.shift1.hub = { captainId: "1", helperIds: ["2"], helperMarches: { "2": 123 } };
  const result = runAutomaticDistribution({ assignments: prior, players, settings, operation: "fill" });
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "1");
  assert.equal(result.assignments.shifts.shift1.hub.helperMarches["2"], 123);
  assert.equal(result.assignments.shifts.shift1.hub.helperIds.includes("3"), true);
  assert.deepEqual(prior.shifts.shift1.hub.helperIds, ["2"]);
  validateTurretDraft(settings, result.assignments, players);
});

test("auto: redistribution retains every manually selected captain and clears old helpers", () => {
  const players = [player(1, "shift1", true), player(2, "shift1", true),
    player(3, "shift1", false), player(4, "shift1", false)];
  const prior = createEmptyAssignments();
  prior.shifts.shift1.west.captainId = "2";
  prior.shifts.shift1.west.helperIds = ["4"];
  prior.shifts.shift1.west.helperMarches = { "4": 72 };
  const result = runAutomaticDistribution({ assignments: prior, players,
    settings, operation: "redistribute" });
  assert.equal(result.assignments.shifts.shift1.west.captainId, "2");
  assert.equal(result.stats.helpersReleased, 1);
  assert.ok(result.stats.helpersAdded >= 1);
  assert.equal(prior.shifts.shift1.west.helperMarches["4"], 72);
  validateTurretDraft(settings, result.assignments, players);
});

test("auto: a single-turret fill does not modify any other turret or shift", () => {
  const players = [player(1, "shift1", true), player(2, "shift1", true), player(3, "shift1", false)];
  const prior = createEmptyAssignments();
  prior.shifts.shift1.north.captainId = "2";
  const result = runAutomaticDistribution({ assignments: prior, players, settings,
    operation: "tower", shift: "shift1", tower: "hub" });
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "1");
  assert.deepEqual(result.assignments.shifts.shift1.north, prior.shifts.shift1.north);
  assert.equal(result.assignments.shifts.shift2.hub.captainId, null);
  validateTurretDraft(settings, result.assignments, players);
});

test("auto: does not use flexible or unknown shift unless enabled", () => {
  const players = [player(1, "flexible", true), player(2, "???", true), player(3, "shift1", true),
    player(4, "flexible", false)];
  const result = auto(players);
  assert.equal(result.assignments.shifts.shift1.hub.captainId, "3");
  assert.equal(locateAssignment(result.assignments, "1"), null);
  assert.equal(locateAssignment(result.assignments, "2"), null);
  assert.equal(locateAssignment(result.assignments, "4"), null);
  const allowed = auto(players, { settings: { ...settings, allowFlexible: true } });
  assert.ok(locateAssignment(allowed.assignments, "1"));
  assert.equal(locateAssignment(allowed.assignments, "2"), null);
});

test("auto: manual flexible shift quotas count BOTH captains and helpers", () => {
  const players = [player(1, "shift1", true), player(2, "shift2", true),
    player(3, "flexible", true), player(4, "flexible", true), player(5, "flexible", false)];
  const bounded = normalizePlannerSettings({ allowFlexible: true, allianceLimits: true,
    shift1Extra: 1, shift2Extra: 0 });
  const result = auto(players, { settings: bounded });
  const flexIds = ["3", "4", "5"].filter((id) => locateAssignment(result.assignments, id));
  assert.equal(flexIds.length, 1);
  assert.equal(locateAssignment(result.assignments, flexIds[0])?.shift, "shift1");
  validateTurretDraft(bounded, result.assignments, players);
});

test("auto: respects troop types, tier caps, shift and rally capacities", () => {
  const players = [player(1, "shift1", true, "fighter", 80, 160),
    player(2, "shift1", false, "fighter", 400, 0, "T11"),
    player(3, "shift1", false, "shooter", 700, 0),
    player(4, "shift2", false, "fighter", 700, 0)];
  const caps = normalizePlannerSettings({ tierLimitsEnabled: true, tierLimits: { T11: 85 } });
  const result = auto(players, { settings: caps });
  const slot = result.assignments.shifts.shift1.hub;
  assert.deepEqual(slot.helperIds, ["2"]);
  assert.equal(slot.helperMarches["2"], 85);
  assert.equal(locateAssignment(result.assignments, "3"), null);
  assert.equal(locateAssignment(result.assignments, "4"), null);
  validateTurretDraft(caps, result.assignments, players);
});

test("auto: manual mode rejects automatic changes", () => {
  const result = auto(roster(), { settings: { ...settings, mode: "manual" } });
  assert.equal(result.error, "manualMode");
  assert.equal(result.assignments, undefined);
});

test("auto: maxMarch mode fills helpers efficiently and stays within server rules", () => {
  const players = [player(1, "shift1", true, "fighter", 200, 700),
    player(2, "shift1", false, "fighter", 610),
    player(3, "shift1", false, "fighter", 540),
    player(4, "shift1", false, "fighter", 300)];
  const high = normalizePlannerSettings({ mode: "maxMarch" });
  const result = auto(players, { settings: high });
  const slot = result.assignments.shifts.shift1.hub;
  assert.deepEqual(slot.helperIds, ["2", "3"]);
  assert.deepEqual(slot.helperMarches, { "2": 610, "3": 90 });
  validateTurretDraft(high, result.assignments, players);
});

test("auto: no eligible players or invalid request leaves draft unchanged", () => {
  const empty = createEmptyAssignments();
  const untouched = auto([]);
  assert.equal(untouched.stats.changed, false);
  assert.deepEqual(untouched.assignments, empty);
  assert.equal(runAutomaticDistribution({ assignments: empty, players: [], settings,
    operation: "tower", shift: "unknown", tower: "hub" }).error, "invalid");
});

test("auto: respects 29 helpers per turret even with unlimited free rally size", () => {
  const players = [player(1, "shift1", true, "fighter", 200, 1000000),
    ...Array.from({ length: 90 }, (_, i) => player(i + 2, "shift1", false, "fighter", 10000))];
  const result = auto(players);
  const slot = result.assignments.shifts.shift1.hub;
  assert.equal(slot.helperIds.length, 29);
  assert.equal(result.stats.helpersAdded, 29);
  assert.equal(result.stats.unassigned, 61);
  validateTurretDraft(settings, result.assignments, players);
});

test("auto: repeated top-up is idempotent", () => {
  const players = roster();
  const first = auto(players);
  const second = auto(players, { assignments: first.assignments });
  assert.deepEqual(second.assignments, first.assignments);
  assert.equal(second.stats.changed, false);
  assert.equal(second.stats.helpersAdded, 0);
  assert.equal(second.stats.captainsAdded, 0);
});

test("auto: flexible quota includes already assigned flexible captains", () => {
  const players = [player(1, "flexible", true), player(2, "flexible", false),
    player(3, "shift1", false), player(4, "shift2", true)];
  const prior = createEmptyAssignments();
  prior.shifts.shift1.hub.captainId = "1";
  const capped = normalizePlannerSettings({ allowFlexible: true, allianceLimits: true,
    shift1Extra: 1, shift2Extra: 0 });
  const result = auto(players, { assignments: prior, settings: capped });
  assert.equal(locateAssignment(result.assignments, "2"), null);
  assert.equal(result.assignments.shifts.shift1.hub.helperIds.includes("3"), true);
  validateTurretDraft(capped, result.assignments, players);
});

test("auto: frozen inputs prove there is no mutation of player registrations or published assignments", () => {
  const players = [Object.freeze(player(1, "shift1", true)), Object.freeze(player(2, "shift1", false))];
  Object.freeze(players);
  const prior = createEmptyAssignments();
  Object.freeze(prior.shifts.shift1.hub.helperIds);
  Object.freeze(prior.shifts.shift1.hub.helperMarches);
  Object.freeze(prior.shifts.shift1.hub);
  const state = Object.freeze(prior);
  const outcome = auto(players, { assignments: state });
  assert.equal(outcome.stats.changed, true);
  assert.equal(prior.shifts.shift1.hub.captainId, null);
  assert.deepEqual(prior.shifts.shift1.hub.helperIds, []);
  validateTurretDraft(settings, outcome.assignments, players);
});
