import test from "node:test";
import assert from "node:assert/strict";
import { getActivePlannerShifts } from "../src/features/turrets/plannerShifts.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { addPlannerFlexibleShifts, applyPlannerShiftOverrides } from "../src/features/turrets/plannerShiftOverrides.js";
import { createEmptyAssignments, completeAssignmentShifts, changeCaptain } from "../src/features/turrets/turretAssignments.js";
import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import { validateTurretDraft, PlanError, createPublicPlan } from "../worker/src/turrets/validate.js";

const p = (id, shift, captain = false, alliance = "ZLO") => ({
  id: String(id), nickname: `P${id}`, shift, alliance, captain, troopType: "fighter",
  tier: "T12", marchSize: 500, rallySize: captain ? 20000 : 0,
});
const reg = [p(1,"shift3",true), p(2,"shift3"), p(3,"shift4",true), p(4,"shift4"), p(5,"flexible")];

const allEnabled = { shift1:true, shift2:true, shift3:true, shift4:true, flexible:true };

test("four shifts: activated on first load from registration settings", () => {
  assert.deepEqual(getActivePlannerShifts(allEnabled), ["shift1","shift2","shift3","shift4"]);
  assert.deepEqual(getActivePlannerShifts({shift1:true,shift2:true,shift3:false,shift4:false}), ["shift1","shift2"]);
});

test("four shifts: limits are normalized to 0..100 for every shift", () => {
  const settings = normalizePlannerSettings({ allianceLimits:true, shift3Limit:1000, shift4Limit:-2 });
  assert.equal(settings.shift3Limit,100);
  assert.equal(settings.shift4Limit,0);
  assert.equal(settings.shift4Extra,0);
});

test("four shifts: any-shift reassignment never mutates registration rows", () => {
  const cfg = normalizePlannerSettings(null);
  const result = addPlannerFlexibleShifts(reg,cfg,createEmptyAssignments(),0,0,1,0);
  assert.equal(result.added3,1);
  assert.equal(reg[4].shift,"flexible");
  const effective = applyPlannerShiftOverrides(reg,result.shiftOverrides);
  assert.equal(effective[4].shift,"shift3");
});

test("four shifts: captains and helpers can fill shift3 and shift4, then publish", () => {
  const settings = normalizePlannerSettings(null);
  const result = runAutomaticDistribution({
    assignments:createEmptyAssignments(), players:reg, settings, operation:"fill",
    activeShifts:["shift3","shift4"],
  });
  assert.ok(result.stats.captainsAdded >= 2);
  assert.ok(result.stats.helpersAdded >= 2);
  assert.equal(result.assignments.shifts.shift3.hub.captainId,"1");
  assert.equal(result.assignments.shifts.shift4.hub.captainId,"3");
  const validated = validateTurretDraft(settings,result.assignments,reg);
  assert.ok(validated.count >= 4);
  const publicPlan = createPublicPlan(validated.assignments,reg,["shift3","shift4"]);
  assert.deepEqual(Object.keys(publicPlan).filter((key) => key.startsWith("shift")), ["shift3", "shift4"]);
  assert.deepEqual(publicPlan.__languages, ["uk", "en"]);
});

test("four shifts: legacy two-shift drafts still normalize and validate", () => {
  const old = createEmptyAssignments();
  delete old.shifts.shift3;
  delete old.shifts.shift4;
  const updated = completeAssignmentShifts(old);
  assert.equal(Object.keys(updated.shifts).length,4);
  assert.equal(validateTurretDraft(normalizePlannerSettings(null),old,[]).count,0);
});

test("four shifts: hard 100 seats per shared shift are enforced for manual and worker", () => {
  const players = [
    ...[1000,1001,1002,1003].map((id) => p(id,"shift3",true)),
    ...Array.from({length:97},(_,i) => p(i+1,"shift3",i===96)),
  ];
  const assignments = createEmptyAssignments();
  ["hub","north","west","east"].forEach((tower, i) => {
    const slot = assignments.shifts.shift3[tower];
    slot.captainId = String(1000+i);
    slot.helperIds = Array.from({length:24},(_,j) => String(i*24+j+1));
    slot.helperMarches = Object.fromEntries(slot.helperIds.map((id) => [id,1]));
  });
  assert.equal(validateTurretDraft(normalizePlannerSettings(null),assignments,players).count,100);
  assert.equal(changeCaptain(assignments,"shift3","south","97",players,normalizePlannerSettings(null)).error,"shiftFull");
  assignments.shifts.shift3.south.captainId="97";
  assert.throws(() => validateTurretDraft(normalizePlannerSettings(null),assignments,players),
    (e) => e instanceof PlanError && e.message === "TURRET_SHIFT_CAPACITY_EXCEEDED");
});

test("regression: distribution keeps existing ConfirmModal and preloads registration settings", async () => {
  const { readFile } = await import("node:fs/promises");
  const [cycle, settings, admin] = await Promise.all([
    readFile(new URL("../src/pages/Admin/turrets/TurretDistributionCycle.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Admin/turrets/DistributionSettings.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Admin/Admin.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(cycle, /<ConfirmModal/);
  assert.match(cycle, /resolveTurretFeedback/);
  assert.doesNotMatch(settings, /window\.confirm\s*\(/);
  assert.match(settings, /requestConfirm/);
  assert.match(admin, /const needsRegistrationSettings = \[[\s\S]*?"distribution"/);
});
