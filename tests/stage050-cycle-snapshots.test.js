import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicCycleCloseAtMs,
  isSnapshotForActivePeriod,
} from "../shared/registrationCycle.js";

const event = "2026-10-17T10:00:00.000Z"; // 24h Saturday/Sunday Wasteland
const isoMs = (s) => Date.parse(s);

test("public roster remains visible after Sunday 19 JST until Monday 09 JST", () => {
  const snapshot = { periodId: 11, cycleEventStartAt: event };
  assert.equal(getPublicCycleCloseAtMs(isoMs(event) + 86_400_000), isoMs("2026-10-19T00:00:00.000Z"));
  assert.equal(isSnapshotForActivePeriod(snapshot, 11, isoMs("2026-10-18T23:59:59.999Z")), true);
  assert.equal(isSnapshotForActivePeriod(snapshot, 11, isoMs("2026-10-19T00:00:00.000Z")), false);
});

test("manual new cycle never serves an old snapshot with a different D1 period id", () => {
  const old = { periodId: 11, cycleEventStartAt: "2026-10-31T10:00:00.000Z" };
  assert.equal(isSnapshotForActivePeriod(old, 12, isoMs("2026-10-20T00:00:00.000Z")), false);
  assert.equal(isSnapshotForActivePeriod(old, 11, isoMs("2026-10-20T00:00:00.000Z")), true);
});

test("manual access cannot show an expired plan even without a period id hint", () => {
  assert.equal(isSnapshotForActivePeriod({ periodId: 11, cycleEventStartAt: event },
    undefined, isoMs("2026-10-20T00:00:00.000Z")), false);
});

test("empty period and malformed dates fail closed", () => {
  assert.equal(isSnapshotForActivePeriod({ periodId: 11, cycleEventStartAt: event }, null,
    isoMs("2026-10-18T10:00:00.000Z")), false);
  assert.equal(isSnapshotForActivePeriod({ periodId: 12, cycleEventStartAt: "bad" }, 12), false);
  assert.equal(isSnapshotForActivePeriod(null, 12), false);
});

test("next event's period stays usable before event starts", () => {
  assert.equal(isSnapshotForActivePeriod({ periodId: 12,
    cycleEventStartAt: "2026-10-31T10:00:00.000Z" }, 12,
  isoMs("2026-10-23T00:00:00.000Z")), true);
});
