import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyAssignments, changeCaptain, addHelper, normalizeAssignments } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { addManualTurretPlayer, editTurretPlanPlayer, moveTurretPlanPlayer } from "../src/features/turrets/turretManualActions.js";
import { composePlanPlayers } from "../src/features/turrets/turretPlanPlayers.js";
import { updateTowerRule } from "../src/features/turrets/turretSlotRules.js";
import { recalculateTurret } from "../src/features/turrets/turretRecalculate.js";
import { validateTurretDraft, createPublicPlan, PlanError } from "../worker/src/turrets/validate.js";

const players = [
  { id: "1", nickname: "First", alliance: "ZLO", shift: "shift1", captain: true, troopType: "fighter", tier: "T12", marchSize: 200, rallySize: 350 },
  { id: "2", nickname: "Second", alliance: "RUS", shift: "shift1", captain: false, troopType: "fighter", tier: "T11", marchSize: 250, rallySize: 0 },
  { id: "3", nickname: "Third", alliance: "MIR", shift: "shift1", captain: false, troopType: "rider", tier: "T10", marchSize: 180, rallySize: 0 },
  { id: "4", nickname: "Fourth", alliance: "MIR", shift: "shift2", captain: true, troopType: "fighter", tier: "T12", marchSize: 300, rallySize: 500 },
  { id: "5", nickname: "Fifth", alliance: "ABC", shift: "shift2", captain: false, troopType: "fighter", tier: "T11", marchSize: 200, rallySize: 0 },
];
const settings = normalizePlannerSettings({});
const manualCaptainId = `m_${"a".repeat(32)}`;
const manualHelperId = `m_${"b".repeat(32)}`;
const manual = { nickname: "Manual", alliance: "IND", tier: "T13", troopType: "fighter", marchSize: 120, rallySize: 220 };

function planWithCaptain() {
  return changeCaptain(createEmptyAssignments(), "shift1", "hub", "1", players, settings).assignments;
}

test("022: manual captain/helper exist only in planner and survive the worker validation/public snapshot", () => {
  const source = JSON.stringify(players);
  const cap = addManualTurretPlayer(createEmptyAssignments(), players, settings, {
    id: manualCaptainId, role: "captain", shift: "shift3", tower: "hub", fields: manual,
  });
  assert.ok(cap.assignments);
  const helper = addManualTurretPlayer(cap.assignments, players, settings, {
    id: manualHelperId, role: "helper", shift: "shift3", tower: "hub", fields: { ...manual, nickname: "Manual2" },
  });
  assert.ok(helper.assignments);
  assert.equal(JSON.stringify(players), source);
  const clean = validateTurretDraft(settings, helper.assignments, players);
  assert.equal(clean.count, 2);
  assert.equal(clean.assignments.manualPlayers[manualHelperId].nickname, "Manual2");
  const published = createPublicPlan(clean.assignments, players, ["shift3"]);
  assert.equal(published.shift3.hub.captain.nickname, "Manual");
  assert.equal(published.shift3.hub.players[0].nickname, "Manual2");
});

test("022: plan-only edit leaves registration unchanged and publishes only overridden fields", () => {
  const assigned = addHelper(planWithCaptain(), "shift1", "hub", "2", players, settings).assignments;
  const source = JSON.stringify(players);
  const edited = editTurretPlanPlayer(assigned, players, settings, "2", { nickname: "Edited", marchSize: 130 });
  assert.ok(edited.assignments);
  assert.equal(JSON.stringify(players), source);
  assert.equal(edited.assignments.shifts.shift1.hub.helperMarches["2"], 130);
  const validated = validateTurretDraft(settings, edited.assignments, players);
  assert.equal(createPublicPlan(validated.assignments, players).shift1.hub.players[0].nickname, "Edited");
});

test("022: manual move edits only the target slot; captain with helpers cannot move", () => {
  let plan = planWithCaptain();
  plan = addHelper(plan, "shift1", "hub", "2", players, settings).assignments;
  const forbidden = moveTurretPlanPlayer(plan, players, settings, "1", {}, { shift: "shift2", tower: "north", role: "captain" });
  assert.equal(forbidden.error, "helpersPresent");
  const move = moveTurretPlanPlayer(plan, players, settings, "2", {}, { shift: "shift2", tower: "hub", role: "helper" });
  assert.equal(move.error, "noCaptain");
  const withNewCaptain = changeCaptain(plan, "shift2", "hub", "4", players, settings).assignments;
  const moved = moveTurretPlanPlayer(withNewCaptain, players, settings, "2", {}, { shift: "shift2", tower: "hub", role: "helper" });
  assert.ok(moved.assignments);
  assert.deepEqual(moved.assignments.shifts.shift1.hub.helperIds, []);
  assert.deepEqual(moved.assignments.shifts.shift2.hub.helperIds, ["2"]);
  assert.equal(players[1].shift, "shift1");
  assert.equal(validateTurretDraft(settings, moved.assignments, players).count, 3);
});

test("022: independent tier recalc modifies only the selected shift/turret", () => {
  let plan = planWithCaptain();
  plan = addHelper(plan, "shift1", "hub", "2", players, settings).assignments;
  plan = changeCaptain(plan, "shift2", "hub", "4", players, settings).assignments;
  plan = addHelper(plan, "shift2", "hub", "5", players, settings).assignments;
  const former = structuredClone(plan.shifts.shift2.hub);
  plan = updateTowerRule(plan, "shift1", "hub", { tierLimits: { T11: 75 } }).assignments;
  const result = recalculateTurret(plan, "shift1", "hub", composePlanPlayers(players, plan), settings);
  assert.ok(result.assignments);
  assert.equal(result.assignments.shifts.shift1.hub.helperMarches["2"], 75);
  assert.deepEqual(result.assignments.shifts.shift2.hub, former);
  assert.equal(validateTurretDraft(settings, result.assignments, players).count, 4);
  const afterF5 = normalizeAssignments(result.assignments, composePlanPlayers(players, result.assignments));
  assert.equal(afterF5.towerRules.shift1.hub.tierLimits.T11, 75);
});

test("022: one turret can disable same-troop restriction without changing other turrets", () => {
  const initial = planWithCaptain();
  assert.equal(addHelper(initial, "shift1", "hub", "3", players, settings).error, "unavailable");
  const relaxed = updateTowerRule(initial, "shift1", "hub", { flags: { sameTroopType: false } }).assignments;
  const added = addHelper(relaxed, "shift1", "hub", "3", players, settings);
  assert.ok(added.assignments);
  const validated = validateTurretDraft(settings, added.assignments, players);
  assert.equal(validated.assignments.shifts.shift1.hub.helperIds[0], "3");
  assert.equal(relaxed.towerRules.shift2, undefined);
});

test("022: worker rejects forged manual players and invalid tier rules", () => {
  const draft = createEmptyAssignments();
  draft.manualPlayers = { [manualCaptainId]: { ...manual, shift: "shift1", captain: true, role: "admin" } };
  assert.throws(() => validateTurretDraft(settings, draft, players), (error) =>
    error instanceof PlanError && error.message === "INVALID_TURRET_DRAFT");
  delete draft.manualPlayers;
  draft.towerRules = { shift1: { hub: { tierLimits: { T11: 11000000 } } } };
  assert.throws(() => validateTurretDraft(settings, draft, players), (error) =>
    error instanceof PlanError && error.message === "INVALID_TURRET_DRAFT");
});

test("022: a later edit preserves plan-only shift after moving a registered player", () => {
  let plan = planWithCaptain();
  plan = addHelper(plan, "shift1", "hub", "2", players, settings).assignments;
  plan = changeCaptain(plan, "shift2", "hub", "4", players, settings).assignments;
  plan = moveTurretPlanPlayer(plan, players, settings, "2", {},
    { shift: "shift2", tower: "hub", role: "helper" }).assignments;
  const later = editTurretPlanPlayer(plan, composePlanPlayers(players, plan), settings, "2",
    { nickname: "Moved and edited" });
  assert.ok(later.assignments);
  assert.equal(later.assignments.playerOverrides["2"].shift, "shift2");
  assert.equal(validateTurretDraft(settings, later.assignments, players).count, 3);
  assert.equal(players[1].shift, "shift1");
});

test("022: per-turret maximum helper count applies to manual selection and worker", () => {
  let plan = planWithCaptain();
  plan = updateTowerRule(plan, "shift1", "hub", { maxHelpers: 1 }).assignments;
  const first = addHelper(plan, "shift1", "hub", "2", players, settings);
  assert.ok(first.assignments);
  assert.equal(addHelper(first.assignments, "shift1", "hub", "3", players,
    { ...settings, sameTroopType: false }).error, "full");
  assert.equal(validateTurretDraft(settings, first.assignments, players).count, 2);
  const over = structuredClone(first.assignments);
  over.shifts.shift1.hub.helperIds.push("3");
  over.shifts.shift1.hub.helperMarches["3"] = 1;
  assert.throws(() => validateTurretDraft({ sameTroopType: false }, over, players), (err) =>
    err instanceof PlanError && err.message === "TURRET_CAPACITY_EXCEEDED");
});

test("022: the manual player, edits and one-turret tier rule survive the browser workspace", async () => {
  const { writeTurretWorkspace, readTurretWorkspace } = await import("../src/features/turrets/localTurretWorkspace.js");
  let plan = addManualTurretPlayer(createEmptyAssignments(), players, settings, {
    id: manualCaptainId, role: "captain", shift: "shift4", tower: "east", fields: manual,
  }).assignments;
  plan = updateTowerRule(plan, "shift4", "east", { flags: { respectShift: false },
    tierLimits: { T11: 90000 }, maxHelpers: 12 }).assignments;
  const record = new Map();
  const storage = { setItem: (key, value) => record.set(key, value), getItem: (key) => record.get(key) };
  assert.equal(writeTurretWorkspace(5, "admin1", { settings, assignments: plan,
    baseRevision: 0, dirty: true }, storage), true);
  const saved = readTurretWorkspace(5, "admin1", storage);
  assert.ok(saved);
  const recovered = normalizeAssignments(saved.assignments, composePlanPlayers(players, saved.assignments));
  assert.equal(recovered.manualPlayers[manualCaptainId].nickname, "Manual");
  assert.equal(recovered.towerRules.shift4.east.maxHelpers, 12);
  assert.equal(recovered.towerRules.shift4.east.tierLimits.T11, 90000);
  assert.equal(validateTurretDraft(settings, recovered, players).count, 1);
});

test("022: one-turret autofill respects its own max helpers, leaving other shifts untouched", async () => {
  const { runAutomaticDistribution } = await import("../src/features/turrets/autoDistribution.js");
  let plan = planWithCaptain();
  plan = updateTowerRule(plan, "shift1", "hub", { maxHelpers: 1 }).assignments;
  const beforeOther = structuredClone(plan.shifts.shift2.hub);
  const outcome = runAutomaticDistribution({ assignments: plan, players, settings,
    operation: "tower", shift: "shift1", tower: "hub", activeShifts: ["shift1", "shift2"] });
  assert.ok(outcome.assignments);
  assert.equal(outcome.assignments.shifts.shift1.hub.helperIds.length, 1);
  assert.deepEqual(outcome.assignments.shifts.shift2.hub, beforeOther);
});

test("022: tier recalc redistributes unused march to lower uncapped tiers", () => {
  let plan = planWithCaptain();
  plan = addHelper(plan, "shift1", "hub", "2", players, settings).assignments;
  const extended = [...players, { id: "6", nickname: "Lower", alliance: "IND", shift: "shift1",
    captain: false, troopType: "fighter", tier: "T10", marchSize: 250, rallySize: 0 }];
  plan = addHelper(plan, "shift1", "hub", "6", extended, settings).assignments;
  assert.ok(plan);
  const earlier = plan.shifts.shift1.hub.helperMarches["6"];
  plan = updateTowerRule(plan, "shift1", "hub", { tierLimits: { T11: 75 } }).assignments;
  const outcome = recalculateTurret(plan, "shift1", "hub", extended, settings);
  assert.ok(outcome.assignments);
  assert.equal(outcome.assignments.shifts.shift1.hub.helperMarches["2"], 75);
  assert.ok(outcome.assignments.shifts.shift1.hub.helperMarches["6"] >= earlier);
  assert.ok(Object.values(outcome.assignments.shifts.shift1.hub.helperMarches)
    .reduce((sum, march) => sum + march, 0) <= 350);
});
