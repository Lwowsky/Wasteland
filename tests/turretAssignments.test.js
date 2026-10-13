import test from "node:test";
import assert from "node:assert/strict";
import {
  addHelper, availableForShift, changeCaptain, clearTurret,
  createEmptyAssignments, getAssignmentSummary, getCaptainCandidates,
  getHelperCandidates, getTurretMetrics, locateAssignment,
  normalizeAssignments, removeAssignedPlayer, toFinalPlanShape,
} from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";

const players = [
  { id: "1", nickname: "Captain1", alliance: "YYY", shift: "shift1", captain: true, troopType: "fighter", tier: "T12", marchSize: 300, rallySize: 700 },
  { id: "2", nickname: "Helper1", alliance: "MIR", shift: "shift1", captain: false, troopType: "fighter", tier: "T11", marchSize: 600, rallySize: 0 },
  { id: "3", nickname: "Flexible", alliance: "R5", shift: "flexible", captain: true, troopType: "fighter", tier: "T10", marchSize: 400, rallySize: 400 },
  { id: "4", nickname: "OtherShift", alliance: "YYY", shift: "shift2", captain: true, troopType: "shooter", tier: "T10", marchSize: 250, rallySize: 500 },
  { id: "5", nickname: "OtherType", alliance: "YYY", shift: "shift1", captain: false, troopType: "rider", tier: "T10", marchSize: 250, rallySize: 0 },
  { id: "6", nickname: "Helper2", alliance: "MIR", shift: "shift1", captain: false, troopType: "fighter", tier: "T11", marchSize: 300, rallySize: 0 },
];
const settings = normalizePlannerSettings(null);

function withCaptain(id = "1", shift = "shift1", tower = "hub") {
  const outcome = changeCaptain(createEmptyAssignments(), shift, tower, id, players, settings);
  assert.ok(outcome.assignments);
  return outcome.assignments;
}

test("assignments: empty factory yields five turrets in all four supported shifts", () => {
  const state = createEmptyAssignments();
  assert.equal(Object.keys(state.shifts).length, 4);
  assert.equal(Object.keys(state.shifts.shift1).length, 5);
  assert.deepEqual(state.shifts.shift2.north.helperIds, []);
});

test("assignments: only genuine eligible captains are selectable", () => {
  const candidates = getCaptainCandidates(createEmptyAssignments(), players, "shift1", "hub", settings);
  assert.deepEqual(candidates.map((p) => p.id), ["1"]);
  assert.equal(availableForShift(players[2], "shift1", settings), false);
  const flexible = { ...settings, allowFlexible: true };
  assert.ok(getCaptainCandidates(createEmptyAssignments(), players, "shift1", "hub", flexible).some((p) => p.id === "3"));
});

test("assignments: the same registration cannot become captain of two turrets or shifts", () => {
  const assigned = withCaptain();
  const rejected = changeCaptain(assigned, "shift2", "north", "1", players, { ...settings, respectShift: false });
  assert.equal(rejected.error, "unavailable");
  assert.deepEqual(locateAssignment(assigned, "1"), { shift: "shift1", tower: "hub", role: "captain" });
});

test("assignments: helper candidates enforce troop type and shift", () => {
  const assigned = withCaptain();
  assert.deepEqual(getHelperCandidates(assigned, players, "shift1", "hub", settings).map((p) => p.id), ["2", "6"]);
  assert.equal(addHelper(assigned, "shift1", "hub", "4", players, settings).error, "unavailable");
  assert.equal(addHelper(assigned, "shift1", "hub", "5", players, settings).error, "unavailable");
});

test("assignments: helper marches never exceed captain rally and reserve counts are accurate", () => {
  const captain = withCaptain();
  const first = addHelper(captain, "shift1", "hub", "2", players, settings).assignments;
  const second = addHelper(first, "shift1", "hub", "6", players, settings).assignments;
  assert.deepEqual(second.shifts.shift1.hub.helperMarches, { "2": 600, "6": 100 });
  assert.equal(getTurretMetrics(second.shifts.shift1.hub, players, settings).free, 0);
  assert.equal(getAssignmentSummary(second, players).assigned, 3);
  assert.equal(getAssignmentSummary(second, players).reserve, 3);
  assert.equal(addHelper(second, "shift1", "hub", "5", players, { ...settings, sameTroopType: false }).error, "noRoom");
});

test("assignments: helper tier limits are respected when enabled", () => {
  const nextSettings = { ...settings, tierLimitsEnabled: true, tierLimits: { T11: 100 } };
  const first = addHelper(withCaptain(), "shift1", "hub", "2", players, nextSettings).assignments;
  assert.equal(first.shifts.shift1.hub.helperMarches["2"], 100);
});

test("assignments: captain cannot be removed or changed before helpers are released", () => {
  const assigned = addHelper(withCaptain(), "shift1", "hub", "2", players, settings).assignments;
  assert.equal(removeAssignedPlayer(assigned, "1").error, "helpersPresent");
  assert.equal(changeCaptain(assigned, "shift1", "hub", "", players, settings).error, "helpersPresent");
  const afterHelper = removeAssignedPlayer(assigned, "2").assignments;
  assert.equal(removeAssignedPlayer(afterHelper, "1").assignments.shifts.shift1.hub.captainId, null);
});

test("assignments: clearing one turret returns all players to reserve and leaves others untouched", () => {
  const assigned = addHelper(withCaptain(), "shift1", "hub", "2", players, settings).assignments;
  const cleared = clearTurret(assigned, "shift1", "hub").assignments;
  assert.equal(getAssignmentSummary(cleared, players).reserve, players.length);
  assert.equal(assigned.shifts.shift1.hub.captainId, "1");
});

test("assignments: normalization drops deleted and duplicate registrations", () => {
  const assignments = withCaptain();
  assignments.shifts.shift1.hub.helperIds = ["2", "2", "missing", "3"];
  assignments.shifts.shift1.hub.helperMarches = { "2": 600, "3": 400 };
  assignments.shifts.shift2.north.captainId = "2";
  const normalized = normalizeAssignments(assignments, players);
  assert.deepEqual(normalized.shifts.shift1.hub.helperIds, ["3"]);
  assert.equal(normalized.shifts.shift1.hub.helperMarches["3"], 400);
  assert.equal(normalized.shifts.shift2.north.captainId, "2");
});

test("assignments: normalization reduces stale over-capacity marches after a data update", () => {
  const assignments = withCaptain();
  assignments.shifts.shift1.hub.helperIds = ["2", "6"];
  assignments.shifts.shift1.hub.helperMarches = { "2": 600, "6": 300 };
  const smaller = players.map((p) => p.id === "1" ? { ...p, rallySize: 550 } : p);
  const normalized = normalizeAssignments(assignments, smaller);
  assert.deepEqual(normalized.shifts.shift1.hub.helperIds, ["2"]);
  assert.equal(normalized.shifts.shift1.hub.helperMarches["2"], 550);
});

test("assignments: admin and public board share one projection", () => {
  const assigned = addHelper(withCaptain(), "shift1", "hub", "2", players, settings).assignments;
  const board = toFinalPlanShape(assigned, players, "shift1", settings);
  assert.equal(board.hub.captain.nickname, "Captain1");
  assert.equal(board.hub.players[0].nickname, "Helper1");
  assert.equal(board.hub.players[0].marchSize, 600);
  assert.equal(board.north.captain, null);
});

test("assignments: changes to player shifts or troop types are detected before saving", async () => {
  const { findAssignmentConflicts } = await import("../src/features/turrets/turretAssignments.js");
  const assigned = addHelper(withCaptain(), "shift1", "hub", "2", players, settings).assignments;
  const shifted = players.map((p) => p.id === "2" ? { ...p, shift: "shift2", troopType: "rider" } : p);
  const issues = findAssignmentConflicts(assigned, shifted, settings);
  assert.equal(issues.length, 2);
  assert.deepEqual(issues.map((issue) => issue.reason), ["shift", "troop"]);
  assert.equal(findAssignmentConflicts(assigned, players, settings).length, 0);
});

test("assignments: new tier cap detects outdated helper marches before autofill or D1 save", async () => {
  const { findAssignmentConflicts } = await import("../src/features/turrets/turretAssignments.js");
  const assigned = addHelper(withCaptain(), "shift1", "hub", "2", players, settings).assignments;
  const limited = normalizePlannerSettings({ tierLimitsEnabled: true, tierLimits: { T11: 50 } });
  const conflicts = findAssignmentConflicts(assigned, players, limited);
  assert.ok(conflicts.some((problem) => problem.playerId === "2" && problem.reason === "marchLimit"));
});
