import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { resolveTurretFeedback } from "../src/features/turrets/turretFeedback.js";
import { updateOrderedTierLimits } from "../src/features/turrets/plannerTierDisplay.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { createEmptyAssignments, getHelperMarch, locateAssignment } from "../src/features/turrets/turretAssignments.js";
import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";

const uk = JSON.parse(fs.readFileSync(new URL("../src/i18n/locales/uk/admin/distribution.json", import.meta.url), "utf8"));
const en = JSON.parse(fs.readFileSync(new URL("../src/i18n/locales/en/admin/distribution.json", import.meta.url), "utf8"));

test("site020: autoFilled message doesn't crash on nonexistent planner.messages", () => {
  for (const locale of [uk, en]) {
    assert.equal(locale.planner.messages, undefined);
    const text = resolveTurretFeedback(locale, "autoFilled", {
      captainsAdded: 5, helpersAdded: 24, helpersReleased: 0, unassigned: 12,
    });
    assert.ok(text.includes("24"), text);
    assert.ok(text.includes("12"), text);
    assert.ok(!text.includes("{{"), text);
    assert.equal(resolveTurretFeedback(locale, "missingKey"), "");
    assert.ok(resolveTurretFeedback(locale, "sharedSaved"));
  }
});

test("site020: realistic auto fill assigns helpers and generates safe feedback", () => {
  const players = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `C${i}`, nickname: `Captain ${i}`, shift: i % 2 ? "shift2" : "shift1", captain: true, troopType: "fighter", tier: "T14", marchSize: 100000, rallySize: 600000, alliance: "A" })),
    ...Array.from({ length: 40 }, (_, i) => ({ id: `H${i}`, nickname: `Helper ${i}`, shift: i % 2 ? "shift2" : "shift1", captain: false, troopType: "fighter", tier: "T12", marchSize: 180000, rallySize: 0, alliance: "B" })),
  ];
  const result = runAutomaticDistribution({ assignments: createEmptyAssignments(), players,
    settings: normalizePlannerSettings(null), operation: "fill" });
  assert.equal(result.error, undefined);
  assert.equal(result.stats.captainsAdded, 4);
  assert.ok(result.stats.helpersAdded > 0);
  assert.ok(locateAssignment(result.assignments, "H0"));
  const rendered = resolveTurretFeedback(uk, "autoFilled", result.stats);
  assert.ok(rendered.includes(String(result.stats.helpersAdded)));
});

test("site020: disabled tier caps mean actual march, not a misleading median", () => {
  const settings = normalizePlannerSettings(null);
  assert.equal(getHelperMarch({ marchSize: 491000, tier: "T13" }, settings), 491000);
  const component = fs.readFileSync(new URL("../src/pages/Admin/turrets/TierMarchSettings.jsx", import.meta.url), "utf8");
  assert.match(component, /t\.noLimit/);
  assert.doesNotMatch(component, /getAutomaticTierMarches/);
});

test("site020: manually editing a tier adjusts neighbours without changing hidden tiers", () => {
  const s = normalizePlannerSettings(null);
  const tiers = ["T14", "T13", "T12", "T11", "T10", "T9"];
  const lower = updateOrderedTierLimits(s, "T14", 210000, tiers);
  assert.equal(lower.T14, 210000);
  for (let i = 1; i < tiers.length; i++) assert.ok(lower[tiers[i-1]] > lower[tiers[i]]);
  const higher = updateOrderedTierLimits({ ...s, tierLimits: lower }, "T10", 400000, tiers);
  for (let i = 1; i < tiers.length; i++) assert.ok(higher[tiers[i-1]] > higher[tiers[i]]);
  assert.equal(higher.T8, s.tierLimits.T8); // disabled tier is not touched
  const unlimited = updateOrderedTierLimits(s, "T14", 0, tiers);
  assert.equal(unlimited.T14, 0); // existing policy: zero means unlimited
});

test("site020: all important turret confirmations have migrated from browser dialogs", () => {
  for (const name of ["DistributionSettings", "TurretSettings", "FinalPlanAdminPreview", "TurretWorkspaceStatus"]) {
    const source = fs.readFileSync(new URL(`../src/pages/Admin/turrets/${name}.jsx`, import.meta.url), "utf8");
    assert.ok(!source.includes("window.confirm"), name);
    assert.ok(source.includes("requestConfirm"), name);
  }
});
