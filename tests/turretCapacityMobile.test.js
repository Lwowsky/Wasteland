import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import { createEmptyAssignments, getTurretMetrics } from "../src/features/turrets/turretAssignments.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { resolveTurretFeedback } from "../src/features/turrets/turretFeedback.js";
import { validateTurretDraft } from "../worker/src/turrets/validate.js";

const captain = (rally = 300000) => ({ id: "1", nickname: "Captain", shift: "shift1",
  captain: true, troopType: "fighter", tier: "T14", marchSize: 400000, rallySize: rally, alliance: "A" });
const helpers = (count, start = 1) => Array.from({ length: count }, (_, n) => ({
  id: String(start + n + 1), nickname: `Helper-${start + n}`, shift: "shift1", captain: false,
  troopType: "fighter", tier: n % 2 ? "T13" : "T14", marchSize: 190000, rallySize: 0, alliance: "B",
}));
function auto(players, assignments = createEmptyAssignments(), operation = "tower", mode = "maxMarch") {
  return runAutomaticDistribution({
    players, assignments, settings: normalizePlannerSettings({ mode }),
    operation, shift: "shift1", tower: "hub",
  });
}

test("new autofill reserves up to 29 helper seats before growing marches (max march)", () => {
  const players = [captain(), ...helpers(37)];
  const { assignments, stats } = auto(players);
  const slot = assignments.shifts.shift1.hub;
  assert.equal(slot.helperIds.length, 29);
  assert.equal(new Set(slot.helperIds).size, 29);
  assert.equal(stats.helpersAdded, 29);
  assert.ok(slot.helperIds.every((id) => slot.helperMarches[id] > 0 && slot.helperMarches[id] <= 190000));
  assert.ok(getTurretMetrics(slot, players).helpersMarch <= 300000);
  assert.equal(validateTurretDraft(normalizePlannerSettings({ mode: "maxMarch" }), assignments, players).count, 30);
});

test("top up may compact large existing helper marches to make room for more helpers", () => {
  const players = [captain(), ...helpers(35)];
  const draft = createEmptyAssignments();
  draft.shifts.shift1.hub = { captainId: "1", helperIds: ["2", "3"],
    helperMarches: { "2": 150000, "3": 150000 } };
  const before = JSON.stringify(draft);
  const result = auto(players, draft);
  const slot = result.assignments.shifts.shift1.hub;
  assert.equal(slot.captainId, "1");
  assert.equal(slot.helperIds.length, 29);
  assert.equal(result.stats.helpersAdded, 27);
  assert.equal(new Set(slot.helperIds).size, 29);
  assert.ok(slot.helperMarches["2"] < 150000 || slot.helperMarches["3"] < 150000);
  assert.ok(getTurretMetrics(slot, players).helpersMarch <= 300000);
  assert.equal(JSON.stringify(draft), before, "input draft must not be mutated");
  validateTurretDraft(normalizePlannerSettings({ mode: "maxMarch" }), result.assignments, players);
});

test("top-up does not rewrite manual marches when no eligible reserve helper exists", () => {
  const players = [captain(), ...helpers(2)];
  const draft = createEmptyAssignments();
  draft.shifts.shift1.hub = { captainId: "1", helperIds: ["2", "3"],
    helperMarches: { "2": 150000, "3": 150000 } };
  const result = auto(players, draft);
  assert.deepEqual(result.assignments, draft);
  assert.equal(result.stats.changed, false);
});

test("balanced fill fits 29 and preserves tier/rally server rules", () => {
  const players = [captain(), ...helpers(40)];
  const result = auto(players, createEmptyAssignments(), "tower", "balanced");
  assert.equal(result.assignments.shifts.shift1.hub.helperIds.length, 29);
  validateTurretDraft(normalizePlannerSettings({ mode: "balanced" }), result.assignments, players);
});

test("mobile heading and automatic distribution must not inherit 280px vertical flex basis", () => {
  const base = new URL("../src/pages/Admin/turrets/", import.meta.url);
  const css = fs.readFileSync(new URL("TurretDistributionHeader.css", base), "utf8");
  const settings = fs.readFileSync(new URL("DistributionSettings.css", base), "utf8");
  const tier = fs.readFileSync(new URL("TierMarchSettings.jsx", base), "utf8");
  assert.match(css, /\.turret-distribution-heading__title\s*\{\s*flex:\s*none/);
  assert.match(settings, /\.planner-auto-panel\s*>\s*div:first-child\s*\{\s*flex:\s*none/);
  assert.match(tier, /planner-tier-unlimited/);
});

test("rebalanced existing helper marches are explained in localized feedback", () => {
  const locale = JSON.parse(fs.readFileSync(new URL("../src/i18n/locales/uk/admin/distribution.json", import.meta.url), "utf8"));
  const feedback = resolveTurretFeedback(locale, "autoFilled", {
    captainsAdded: 0, helpersAdded: 27, helpersReleased: 0, unassigned: 8, resizedHelpers: 2,
  });
  assert.match(feedback, /27/);
  assert.match(feedback, /2 раніше/);
});
