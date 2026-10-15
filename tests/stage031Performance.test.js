import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAssignments, normalizeAssignments, findAssignmentConflicts, getTurretMetrics } from "../src/features/turrets/turretAssignments.js";
import { releaseAllTurretHelpers } from "../src/features/turrets/turretRedistribution.js";
import { runAutomaticDistribution } from "../src/features/turrets/autoDistribution.js";
import { normalizePlannerSettings } from "../src/features/turrets/plannerSettings.js";
import { PLANNER_SHIFTS, TURRET_IDS } from "../src/features/turrets/plannerConstants.js";
import { readFileSync } from "node:fs";

const player = (id, shift = "shift1", captain = false, troopType = "fighter") => ({
  id: String(id), nickname: `P${id}`, alliance: `A${id % 7}`, tier: `T${14 - id % 5}`,
  shift, captain, troopType, marchSize: 600 + id % 13 * 100,
  rallySize: captain ? 25000 : 0,
});
const settings = normalizePlannerSettings({ mode: "maxMarch", respectShift: false });
const changes = ["fill", "redistribute", "tower"];

function seeded() {
  const roster = Array.from({ length: 160 }, (_, i) => player(i + 1, PLANNER_SHIFTS[i % 4], i < 20));
  const plan = createEmptyAssignments();
  // Manual captains on all four shifts, including a captain with no registered captain flag.
  for (let i = 0; i < 16; i++) {
    const shift = PLANNER_SHIFTS[i % 4];
    const tower = TURRET_IDS[Math.floor(i / 4)];
    plan.shifts[shift][tower].captainId = String(i + 1);
  }
  plan.shifts.shift1.hub.helperIds = ["25"];
  plan.shifts.shift1.hub.helperMarches = { "25": 250 };
  plan.shifts.shift3.north.captainId = "missing-manual-captain";
  return { roster, plan };
}

test("031: reuse an indexed roster without changing the turret metrics", () => {
  const { roster, plan } = seeded();
  const map = new Map(roster.map((p) => [p.id, p]));
  for (const shift of PLANNER_SHIFTS) for (const tower of TURRET_IDS) {
    const slot = plan.shifts[shift][tower];
    assert.deepEqual(getTurretMetrics(slot, roster, settings, map), getTurretMetrics(slot, roster, settings));
  }
});

test("031: all automatic operations preserve every manually chosen captain and do not mutate the original", () => {
  const { roster, plan } = seeded();
  const before = structuredClone(plan);
  for (const operation of changes) {
    const outcome = runAutomaticDistribution({ assignments: plan, players: roster, settings,
      operation, shift: "shift1", tower: "hub", activeShifts: PLANNER_SHIFTS });
    assert.equal(outcome.error, undefined, operation);
    for (const shift of PLANNER_SHIFTS) for (const tower of TURRET_IDS) {
      const selected = plan.shifts[shift][tower].captainId;
      if (selected) assert.equal(outcome.assignments.shifts[shift][tower].captainId, selected,
        `${operation}: ${shift}:${tower}`);
    }
    assert.deepEqual(plan, before);
  }
  const cleared = releaseAllTurretHelpers(plan);
  for (const shift of PLANNER_SHIFTS) for (const tower of TURRET_IDS) {
    assert.equal(cleared.assignments.shifts[shift][tower].captainId, plan.shifts[shift][tower].captainId);
  }
});

test("031: top-up retains existing helpers, and redistribution rebuilds them", () => {
  const { roster, plan } = seeded();
  const fill = runAutomaticDistribution({ assignments: plan, players: roster, settings,
    operation: "fill", activeShifts: PLANNER_SHIFTS });
  assert.ok(fill.assignments.shifts.shift1.hub.helperIds.includes("25"));
  const redistributed = runAutomaticDistribution({ assignments: plan, players: roster, settings,
    operation: "redistribute", activeShifts: PLANNER_SHIFTS });
  assert.equal(redistributed.stats.helpersReleased, 1);
  assert.equal(plan.shifts.shift1.hub.helperMarches["25"], 250);
});

test("031: stale registration must never silently erase a manually assigned captain", () => {
  const { roster, plan } = seeded();
  const normalized = normalizeAssignments(plan, roster);
  assert.equal(normalized.shifts.shift3.north.captainId, "missing-manual-captain");
  assert.ok(findAssignmentConflicts(normalized, roster, settings).some((issue) =>
    issue.reason === "captainMissing" && issue.playerId === "missing-manual-captain"));
});

test("Stage 7: public table uses one load rather than background polling", () => {
  const source = readFileSync(new URL("../src/pages/Players/usePublicPlayers.js", import.meta.url), "utf8");
  assert.match(source, /getPublicPlayers\(/);
  assert.doesNotMatch(source, /startVisiblePolling|setInterval|setTimeout/);
});

test("Stage 7: public dashboard uses one load rather than background polling", () => {
  const source = readFileSync(new URL("../src/pages/Home/Home.jsx", import.meta.url), "utf8");
  assert.match(source, /getPublicStats\(/);
  assert.match(source, /getRecentPlayers\(/);
  assert.doesNotMatch(source, /startVisiblePolling|setInterval|setTimeout/);
});
