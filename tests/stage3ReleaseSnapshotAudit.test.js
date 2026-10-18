import test from "node:test";
import assert from "node:assert/strict";
import { auditPublishedSnapshot } from "../worker/src/public/snapshotAudit.js";

const player = (name, alliance, id) => ({ id, nickname: name, alliance, troopType: "rider", tier: "T9", shift: "shift1", captain: 1, createdAt: "2026-10-17" });
const fixture = () => ({
  revision: { revision: 42 },
  summary: { stats: { finalPlayers: 2 }, recentPlayers: [player("Alice", "AAA", 1)] },
  players: { accessMode: "public", total: 2, players: [player("Alice", "AAA", 1), player("Bob", "BBB", 2)] },
  finalPlan: { accessMode: "public", plan: {
    shift1: { hub: { captain: { id: "shift1-hub-captain", nickname: "Alice", alliance: "AAA" }, players: [{ id: "one", nickname: "Bob", alliance: "BBB" }] } },
    shift2: { hub: { captain: { id: "shift2-hub-captain", nickname: "Alice", alliance: "AAA" }, players: [{ id: "two", nickname: "Bob", alliance: "BBB" }] } },
  } },
});

test("Stage 3 release: two people across two shifts remain two in static home statistics", () => {
  assert.deepEqual(auditPublishedSnapshot(fixture()), []);
});
test("Stage 3 release: mismatched published statistics cannot pass smoke validation", () => {
  const snapshot = fixture(); snapshot.summary.stats.finalPlayers = 4;
  assert.ok(auditPublishedSnapshot(snapshot).includes("FINAL_COUNT_MISMATCH"));
});
test("Stage 3 release: never expose protected plan payloads in static export", () => {
  const snapshot = fixture(); snapshot.finalPlan.accessMode = "private";
  assert.ok(auditPublishedSnapshot(snapshot).includes("PROTECTED_PLAN_EXPOSED"));
});
test("Stage 3 release: safe current-cycle preview is max five and has no admin fields", () => {
  const snapshot = fixture(); snapshot.summary.recentPlayers[0].email = "hidden";
  assert.ok(auditPublishedSnapshot(snapshot).includes("UNSAFE_PLAYER_FIELDS"));
  delete snapshot.summary.recentPlayers[0].email;
  snapshot.summary.recentPlayers = Array.from({length: 6}, (_, i) => player(`P${i}`, "AAA", i));
  assert.ok(auditPublishedSnapshot(snapshot).includes("INVALID_RECENT_PLAYERS"));
});
test("Stage 3 release: catches incomplete public list or missing revision", () => {
  const snapshot = fixture(); snapshot.players.total = 3; snapshot.revision.revision = 0;
  const errors = auditPublishedSnapshot(snapshot);
  assert.ok(errors.includes("INCOMPLETE_PLAYERS"));
  assert.ok(errors.includes("INVALID_REVISION"));
});

test("Stage 037: link-only JSON must never include plaintext records", () => {
  const snapshot = fixture();
  snapshot.players.accessMode = "link";
  snapshot.finalPlan.accessMode = "link";
  const errors = auditPublishedSnapshot(snapshot);
  assert.ok(errors.includes("UNENCRYPTED_LINK_PLAYERS"));
  assert.ok(errors.includes("PROTECTED_PLAN_EXPOSED"));
  snapshot.players.players = [];
  snapshot.players.total = 0;
  snapshot.players.sealed = { version: 1 };
  snapshot.finalPlan.plan = null;
  snapshot.finalPlan.sealed = { version: 1 };
  assert.deepEqual(auditPublishedSnapshot(snapshot), []);
});
