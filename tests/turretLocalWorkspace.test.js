import test from "node:test";
import assert from "node:assert/strict";
import {
  getTurretWorkspaceKey, readTurretWorkspace, writeTurretWorkspace,
  removeTurretWorkspace, isTurretPlanDirty, resolveTurretWorkspace,
  getTurretRosterFingerprint,
} from "../src/features/turrets/localTurretWorkspace.js";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}
const server = { settings: { mode: "balanced" }, assignments: { shifts: {} } };
const changed = { settings: { mode: "manual" }, assignments: { shifts: {} } };

test("workspace: isolates browser copies by registration period and administrator", () => {
  assert.notEqual(getTurretWorkspaceKey(12, "admin-a"), getTurretWorkspaceKey(13, "admin-a"));
  assert.notEqual(getTurretWorkspaceKey(12, "admin-a"), getTurretWorkspaceKey(12, "admin-b"));
  assert.equal(getTurretWorkspaceKey(null, "admin-a"), null);
  assert.equal(getTurretWorkspaceKey(12, ""), null);
});

test("workspace: many local edits write storage without contacting the server", () => {
  const local = storage();
  for (let i = 1; i <= 100; i++) {
    assert.equal(writeTurretWorkspace(12, "owner", {
      ...changed, settings: { ...changed.settings, count: i }, baseRevision: 3,
      dirty: true, rosterFingerprint: "example",
    }, local), true);
  }
  assert.equal(readTurretWorkspace(12, "owner", local).settings.count, 100);
  assert.equal(local.values.size, 1); // overwritten, not appended
  assert.equal(readTurretWorkspace(13, "owner", local), null);
  assert.equal(readTurretWorkspace(12, "another", local), null);
});

test("workspace: restore unsynced changes when remote revision remains unchanged", () => {
  const restored = resolveTurretWorkspace(server, 7, {
    ...changed, baseRevision: 7, dirty: true,
  });
  assert.deepEqual(restored.snapshot, changed);
  assert.equal(restored.restored, true);
  assert.equal(restored.conflict, false);
});

test("workspace: preserve local changes and require resolution when another admin saves", () => {
  const restored = resolveTurretWorkspace(server, 8, {
    ...changed, baseRevision: 7, dirty: true,
  });
  assert.deepEqual(restored.snapshot, changed);
  assert.equal(restored.conflict, true);
  assert.deepEqual(resolveTurretWorkspace(server, 8, {
    ...changed, baseRevision: 7, dirty: false,
  }).snapshot, server);
});

test("workspace: ignore identical stale work instead of flagging a false conflict", () => {
  const result = resolveTurretWorkspace(server, 10, {
    ...server, baseRevision: 9, dirty: true,
  });
  assert.equal(result.conflict, false);
  assert.equal(result.restored, false);
});

test("workspace: detect meaningful local changes in settings or assignments", () => {
  assert.equal(isTurretPlanDirty(server.settings, server.assignments, server), false);
  assert.equal(isTurretPlanDirty(changed.settings, server.assignments, server), true);
  assert.equal(isTurretPlanDirty(server.settings, { shifts: { shift1: {} } }, server), true);
});

test("workspace: reimport or changed march invalidates the roster signature", () => {
  const players = [
    { id: 10, nickname: "A", shift: "shift1", marchSize: 400, rallySize: 900, captain: true },
    { id: 11, nickname: "B", shift: "flexible", marchSize: 320 },
  ];
  const initial = getTurretRosterFingerprint(players);
  assert.equal(getTurretRosterFingerprint([...players].reverse()), initial);
  assert.notEqual(getTurretRosterFingerprint([{ ...players[0], nickname: "Renamed" }, players[1]]), initial);
  assert.notEqual(getTurretRosterFingerprint([{ ...players[0], marchSize: 380 }, players[1]]), initial);
  assert.notEqual(getTurretRosterFingerprint([{ ...players[0], shift: "shift2" }, players[1]]), initial);
  assert.notEqual(getTurretRosterFingerprint([players[0]]), initial);
});

test("workspace: corrupt records are ignored and can be removed explicitly", () => {
  const local = storage();
  const key = getTurretWorkspaceKey(2, "owner");
  local.setItem(key, '{"broken":');
  assert.equal(readTurretWorkspace(2, "owner", local), null);
  assert.equal(removeTurretWorkspace(2, "owner", local), true);
  assert.equal(local.getItem(key), null);
});

test("workspace: disabled storage is reported and never crashes the editor", () => {
  const unavailable = { getItem() { throw Error("blocked"); }, setItem() { throw Error("quota"); } };
  assert.equal(readTurretWorkspace(2, "owner", unavailable), null);
  assert.equal(writeTurretWorkspace(2, "owner", {
    ...changed, baseRevision: 0, dirty: true,
  }, unavailable), false);
});
