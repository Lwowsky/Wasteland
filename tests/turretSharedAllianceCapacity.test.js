import assert from "node:assert/strict";
import test from "node:test";

import { allianceKey, getAllianceShiftCounts, summarizeSharedAllianceCapacity } from "../src/features/turrets/allianceRules.js";
import { getShiftCapacity, countAssignedInShift, getShiftCapacityStatus } from "../src/features/turrets/shiftCapacity.js";
import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import { createEmptyAssignments, addHelper, changeCaptain, locateAssignment } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { validateTurretDraft, PlanError } from "../worker/src/turrets/validate.js";

const player = (id, alliance, shift = "shift1", captain = false, marchSize = 1000, rallySize = 1_000_000) => ({
  id: String(id), nickname: `P${String(id).padStart(4, "0")}`, alliance, shift, captain,
  troopType: "fighter", tier: "T12", marchSize, rallySize: captain ? rallySize : 0,
});
const withCap = (a = 100, b = 100, extras = {}) => normalizePlannerSettings({
  allianceLimits: true, shift1Limit: a, shift2Limit: b, ...extras,
});
const fill = (players, settings, assignments = createEmptyAssignments(), operation = "fill") =>
  runAutomaticDistribution({ assignments, players, settings, operation });

function assignedIds(assignments, shift) {
  return Object.values(assignments.shifts[shift]).flatMap((slot) =>
    [slot.captainId, ...slot.helperIds].filter(Boolean));
}

test("shared alliance: origin tags stay normalized but do not create separate quotas", () => {
  assert.equal(allianceKey({ alliance: "  mIr  " }), "MIR");
  assert.equal(allianceKey({ alliance: "ＭＩＲ" }), "MIR");
  assert.equal(allianceKey({ allianceTag: " MIR " }), "MIR");
  assert.equal(allianceKey({}), "");
  assert.equal(getShiftCapacity(withCap(0, 100), "shift1"), 0);
  assert.equal(getShiftCapacity(withCap(0, 100), "shift2"), 100);
  assert.equal(getShiftCapacity(normalizePlannerSettings(null), "shift1"), 100);
  assert.equal(getShiftCapacity(withCap(500, 100), "shift1"), 100);
});

test("shared alliance: multiple source alliances together cannot exceed 100 players per shift", () => {
  const players = [
    ...Array.from({ length: 5 }, (_, i) => player(i + 1, `C${i}`, "shift1", true)),
    ...Array.from({ length: 119 }, (_, i) => player(i + 6, `SOURCE${i % 10}`)),
  ];
  const result = fill(players, normalizePlannerSettings(null));
  assert.equal(result.error, undefined);
  assert.equal(countAssignedInShift(result.assignments, "shift1"), 100);
  assert.equal(getShiftCapacityStatus(result.assignments, normalizePlannerSettings(null), "shift1").remaining, 0);
  assert.equal(result.stats.unassigned, 24);
  assert.equal(validateTurretDraft(normalizePlannerSettings(null), result.assignments, players).count, 100);
  const origin = getAllianceShiftCounts(result.assignments, players).shift1.counts;
  assert.ok(origin.size > 1, "the single 100-seat limit must include multiple original alliances");
  assert.equal([...origin.values()].reduce((sum, n) => sum + n, 0), 100);
});

test("shared alliance: custom capacity is one total limit across all origin tags", () => {
  const players = [player(1, "MIR", "shift1", true),
    player(2, "ZLO"), player(3, "RUS"), player(4, "WOF"), player(5, "NAG"),
    player(6, "YYY"), player(7, "XXX")];
  const settings = withCap(3, 100);
  const result = fill(players, settings);
  assert.equal(countAssignedInShift(result.assignments, "shift1"), 3);
  assert.equal(validateTurretDraft(settings, result.assignments, players).count, 3);
  assert.equal(getShiftCapacityStatus(result.assignments, settings, "shift1").remaining, 0);
  const report = summarizeSharedAllianceCapacity(result.assignments, players, settings)[0];
  assert.equal(report.assigned, 3);
  assert.equal(report.capacity, 3);
  assert.equal(report.alliances.reduce((sum, a) => sum + a.count, 0), 3);
});

test("shared alliance: 100 existing seats block a different original alliance manually", () => {
  const players = [
    ...Array.from({ length: 5 }, (_, i) => player(i + 1, `CAP-${i}`, "shift1", true)),
    ...Array.from({ length: 96 }, (_, i) => player(i + 6, i % 2 ? "MIR" : "ZLO")),
  ];
  const assignments = createEmptyAssignments();
  const towers = ["hub", "north", "west", "east", "south"];
  let nextId = 6;
  for (const [index, tower] of towers.entries()) {
    const slot = assignments.shifts.shift1[tower];
    slot.captainId = String(index + 1);
    slot.helperIds = Array.from({ length: 19 }, () => String(nextId++));
    slot.helperMarches = Object.fromEntries(slot.helperIds.map((id) => [id, 1]));
  }
  assert.equal(countAssignedInShift(assignments, "shift1"), 100);
  const config = normalizePlannerSettings(null);
  assert.equal(addHelper(assignments, "shift1", "hub", "101", players, config).error, "shiftFull");
  assert.equal(validateTurretDraft(config, assignments, players).count, 100);
  assignments.shifts.shift1.hub.helperIds.push("101");
  assignments.shifts.shift1.hub.helperMarches["101"] = 1;
  assert.throws(() => validateTurretDraft(config, assignments, players),
    (error) => error instanceof PlanError && error.message === "TURRET_SHIFT_CAPACITY_EXCEEDED");
});

test("shared alliance: zero configured seats blocks auto and manual assignment", () => {
  const players = [player(1, "A", "shift1", true), player(2, "B"), player(3, "C", "shift2", true)];
  const settings = withCap(0, 2);
  const initial = createEmptyAssignments();
  assert.equal(changeCaptain(initial, "shift1", "hub", "1", players, settings).error, "shiftFull");
  const result = fill(players, settings);
  assert.equal(countAssignedInShift(result.assignments, "shift1"), 0);
  assert.equal(countAssignedInShift(result.assignments, "shift2"), 1);
});

test("shared alliance: manually assigned seats count against custom capacity", () => {
  const players = [player(1, "AAA", "shift1", true), player(2, "BBB"),
    player(3, "CCC"), player(4, "DDD"), player(5, "EEE")];
  const assigned = createEmptyAssignments();
  assigned.shifts.shift1.hub.captainId = "1";
  assigned.shifts.shift1.hub.helperIds = ["2"];
  assigned.shifts.shift1.hub.helperMarches = { "2": 100 };
  const settings = withCap(2, 100);
  assert.equal(addHelper(assigned, "shift1", "hub", "3", players, settings).error, "shiftFull");
  const result = fill(players, settings, assigned);
  assert.deepEqual(result.assignments.shifts.shift1.hub, assigned.shifts.shift1.hub);
  assert.equal(countAssignedInShift(result.assignments, "shift1"), 2);
  assert.equal(locateAssignment(result.assignments, "3"), null);
  const reduced = withCap(1, 100);
  const report = summarizeSharedAllianceCapacity(assigned, players, reduced)[0];
  assert.equal(report.exceeded, 1);
  assert.throws(() => validateTurretDraft(reduced, assigned, players),
    (error) => error instanceof PlanError && error.message === "TURRET_SHIFT_CAPACITY_EXCEEDED");
});

test("shared alliance: automatically filled players can come from different origin alliances", () => {
  const players = [player(1, "AAA", "shift1", true),
    ...Array.from({length:20}, (_,i) => player(i+2, i%3 === 0 ? "AAA" : i%3 === 1 ? "BBB" : "CCC"))];
  const settings = withCap(20, 20);
  const first = fill(players, settings);
  const second = fill([...players].reverse(), settings);
  assert.deepEqual(second.assignments, first.assignments);
  assert.equal(countAssignedInShift(first.assignments, "shift1"), 20);
  const groups = getAllianceShiftCounts(first.assignments, players).shift1.counts;
  assert.ok(groups.has("AAA") && groups.has("BBB") && groups.has("CCC"));
});

test("shared alliance: 'Any shift' is still assigned only once across shifts", () => {
  const players = [player(1, "MIR", "shift1", true), player(2, "ZLO", "shift2", true),
    player(3, "RUS", "flexible"), player(4, "WOF", "flexible"), player(5, "NAG", "flexible")];
  const cfg = withCap(3, 3, { allowFlexible: true, shift1Extra: 3, shift2Extra: 3 });
  const result = fill(players, cfg);
  const ids = [...assignedIds(result.assignments, "shift1"), ...assignedIds(result.assignments, "shift2")];
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(countAssignedInShift(result.assignments, "shift1") <= 3);
  assert.ok(countAssignedInShift(result.assignments, "shift2") <= 3);
});

test("shared alliance: redistribution trims a legacy 119-player shift to 100", () => {
  const players = [
    ...Array.from({length:5}, (_,i) => player(i+1, `CAP${i}`, "shift1", true)),
    ...Array.from({length:119}, (_,i) => player(i+6, `ORIGIN${i%12}`)),
  ];
  const initial = createEmptyAssignments();
  const towers = ["hub", "north", "west", "east", "south"];
  let cursor=6;
  for (let i=0;i<5;i++) {
    const slot=initial.shifts.shift1[towers[i]];
    slot.captainId=String(i+1);
    const n=i===4 ? 18 : 24;
    slot.helperIds=Array.from({length:n},()=>String(cursor++));
    slot.helperMarches=Object.fromEntries(slot.helperIds.map((id)=>[id,100]));
  }
  assert.equal(countAssignedInShift(initial,"shift1"),119);
  const cfg=normalizePlannerSettings(null);
  assert.throws(()=>validateTurretDraft(cfg,initial,players),
    (error)=>error.message==="TURRET_SHIFT_CAPACITY_EXCEEDED");
  const next=fill(players,cfg,initial,"redistribute");
  assert.equal(countAssignedInShift(next.assignments,"shift1"),100);
  assert.deepEqual(towers.map((tower)=>next.assignments.shifts.shift1[tower].captainId),
    towers.map((tower)=>initial.shifts.shift1[tower].captainId));
  assert.equal(next.stats.unassigned,24);
  assert.equal(validateTurretDraft(cfg,next.assignments,players).count,100);
});

test("shared alliance: 2,000 players from 53 origin alliances stay within 100 seats per active shift", () => {
  const players=Array.from({length:2000},(_,i)=>player(i+1,`ORG${i%53}`,i%2?"shift1":"shift2",i<20,100000,9000000));
  const cfg=normalizePlannerSettings(null);
  const first=fill(players,cfg);
  const second=fill([...players].reverse(),cfg);
  assert.deepEqual(second.assignments,first.assignments);
  for (const shift of ["shift1","shift2"]) assert.ok(countAssignedInShift(first.assignments,shift)<=100);
  assert.equal(validateTurretDraft(cfg,first.assignments,players).count,
    countAssignedInShift(first.assignments,"shift1")+countAssignedInShift(first.assignments,"shift2"));
});
