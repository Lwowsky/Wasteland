import test from "node:test";
import assert from "node:assert/strict";
import { saveChangedTurretPlan } from "../src/features/turrets/planSync.js";

const original = { settings: { mode: "balanced" }, assignments: { shifts: {} } };
const changed = { settings: { mode: "manual" }, assignments: { shifts: {} } };

test("cloud sync: repeated visits, F5 and unchanged plans require no PUT", async () => {
  let calls = 0;
  const result = await saveChangedTurretPlan({ periodId: 1, revision: 9,
    ...original, committed: original }, async () => { calls += 1; });
  assert.equal(calls, 0);
  assert.deepEqual(result, { revision: 9, draft: null });
});

test("cloud sync: a hundred local edits need one manual PUT with the final snapshot", async () => {
  let calls = 0;
  const final = { ...changed, settings: { ...changed.settings, count: 100 } };
  const saved = await saveChangedTurretPlan({ periodId: 1, revision: 4, ...final,
    committed: original }, async (payload) => {
    calls += 1;
    assert.equal(payload.settings.count, 100);
    assert.equal(payload.revision, 4);
    return { draft: { revision: 5, settings: payload.settings, assignments: payload.assignments } };
  });
  assert.equal(calls, 1);
  assert.equal(saved.revision, 5);
});

test("cloud sync: an administrator conflict stops saving instead of overwriting", async () => {
  await assert.rejects(() => saveChangedTurretPlan({ periodId: 1, revision: 4,
    ...changed, committed: original }, async () => { throw new Error("TURRET_DRAFT_CONFLICT"); }),
  /TURRET_DRAFT_CONFLICT/);
});
