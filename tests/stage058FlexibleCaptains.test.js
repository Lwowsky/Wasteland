import assert from "node:assert/strict";
import test from "node:test";
import {
  availableForShift, captainAvailableForShift, changeCaptain,
  createEmptyAssignments, findAssignmentConflicts,
  getCaptainCandidates, getHelperCandidates,
} from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { canAutoUsePlayer } from "../src/features/turrets/autoCandidates.js";
import { validateTurretDraft, PlanError } from "../worker/src/turrets/validate.js";

const settings = normalizePlannerSettings({ onlyCaptains: true, respectShift: true,
  allowFlexible: false, allianceLimits: false });
function player(id, shift, captain = true) {
  return { id: String(id), nickname: `P${id}`, alliance: "ABC", tier: "T12",
    troopType: "fighter", shift, captain, marchSize: 300, rallySize: 800 };
}
const flexible = player(1, "flexible");
const both = player(2, "both");
const any = player(3, "any");
const helper = player(4, "flexible", false);
const fixedShift = player(5, "shift1");
const roster = [flexible, both, any, helper, fixedShift];

test("058: captains registered Both/Any are selectable in every shift without Allow Any-shift", () => {
  assert.equal(settings.allowFlexible, false);
  for (const shift of ["shift1", "shift2", "shift3", "shift4"]) {
    const candidates = getCaptainCandidates(createEmptyAssignments(), roster, shift, "hub", settings);
    for (const id of ["1", "2", "3"]) {
      assert.ok(candidates.some((p) => p.id === id), `${id} missing in ${shift}`);
    }
    assert.ok(!candidates.some((p) => p.id === "4"));
  }
  assert.equal(availableForShift(flexible, "shift2", settings), false);
  assert.equal(captainAvailableForShift(flexible, "shift2", settings), true);
  assert.equal(captainAvailableForShift(helper, "shift2", settings), false);
  assert.equal(captainAvailableForShift(fixedShift, "shift2", settings), false);
});

test("058: manual captain can be set and persisted in multiple shifts without changing registration shift", () => {
  const initial = createEmptyAssignments();
  const first = changeCaptain(initial, "shift1", "hub", "1", roster, settings);
  assert.ok(first.assignments);
  const second = changeCaptain(first.assignments, "shift2", "north", "1", roster, settings);
  assert.ok(second.assignments);
  assert.equal(second.assignments.shifts.shift1.hub.captainId, "1");
  assert.equal(second.assignments.shifts.shift2.north.captainId, "1");
  assert.equal(changeCaptain(second.assignments, "shift2", "west", "1", roster, settings).error, "unavailable");
  assert.deepEqual(findAssignmentConflicts(second.assignments, roster, settings), []);
  assert.equal(validateTurretDraft(settings, second.assignments, roster).count, 1);
  assert.equal(flexible.shift, "flexible");
  assert.deepEqual(settings.shiftOverrides, {});
});

test("058: unassigned flexible helpers remain gated by Allow Any-shift", () => {
  const plan = changeCaptain(createEmptyAssignments(), "shift2", "hub", "1", roster, settings).assignments;
  assert.ok(plan);
  assert.equal(getHelperCandidates(plan, roster, "shift2", "hub", settings).some((p) => p.id === "4"), false);
  // With onlyCaptains off, a flexible non-captain still cannot bypass the shift rule.
  assert.equal(getCaptainCandidates(createEmptyAssignments(), roster, "shift2", "hub",
    { ...settings, onlyCaptains: false }).some((p) => p.id === "4"), false);
  const illegal = createEmptyAssignments();
  illegal.shifts.shift1.hub.captainId = "5";
  illegal.shifts.shift1.hub.helperIds = ["4"];
  illegal.shifts.shift1.hub.helperMarches = { "4": 50 };
  assert.throws(() => validateTurretDraft(settings, illegal, roster),
    (error) => error instanceof PlanError && error.message === "INVALID_TURRET_HELPER");
});

test("058: autofill still respects the unchecked Any-shift toggle for captains", () => {
  const assignment = createEmptyAssignments();
  const board = new Map([[flexible.id, flexible]]);
  assert.equal(canAutoUsePlayer({ player: flexible, assignments: assignment, settings,
    shift: "shift2", purpose: "captain", roster: board }), false);
  assert.equal(canAutoUsePlayer({ player: flexible, assignments: assignment,
    settings: { ...settings, allowFlexible: true },
    shift: "shift2", purpose: "captain", roster: board }), true);
});
