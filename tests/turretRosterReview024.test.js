import assert from "node:assert/strict";
import { test } from "node:test";
import { canReviewTurretRoster } from "../src/features/turrets/turretRosterReview.js";

test("024: changed registration roster can be acknowledged without circular disable", () => {
  const valid = { ready: true, rosterChanged: true, stale: false,
    conflicts: 0, remoteConflict: false, busy: false };
  assert.equal(canReviewTurretRoster(valid), true);
  assert.equal(canReviewTurretRoster({ ...valid, conflicts: 1 }), false);
  assert.equal(canReviewTurretRoster({ ...valid, stale: true }), false);
  assert.equal(canReviewTurretRoster({ ...valid, remoteConflict: true }), false);
  assert.equal(canReviewTurretRoster({ ...valid, rosterChanged: false }), false);
});
