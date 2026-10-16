import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicStatusFromSnapshot } from "../src/features/contentAccess/publicStatusFromSnapshot.js";
import { getPublicSnapshot } from "../src/features/players/publicSnapshot.js";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function fakeStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

test("stage11: only an explicit public mode can skip the Worker UI check", () => {
  assert.deepEqual(
    publicStatusFromSnapshot("players", { accessMode: "public" }),
    { resource: "players", mode: "public", allowed: true, reason: null },
  );
  for (const mode of ["code", "link", "private", null, undefined, "PUBLIC", "unexpected"]) {
    assert.equal(publicStatusFromSnapshot("players", { accessMode: mode }), null);
  }
  assert.equal(publicStatusFromSnapshot("players", {}), null);
  assert.equal(publicStatusFromSnapshot("final_plan", { accessMode: "public" }), null);
});

test("stage11: a failed HTTP request cannot use a cached public hint", async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = fakeStorage();
  const file = "stage11-offline-hint-test.json";
  const publicPayload = { accessMode: "public", players: [{ id: 1 }] };
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return Response.json(publicPayload);
    throw new Error("NETWORK_OFFLINE");
  };
  try {
    assert.deepEqual(await getPublicSnapshot(file, { requireNetwork: true }), publicPayload);
    await assert.rejects(
      getPublicSnapshot(file, { requireNetwork: true }),
      /NETWORK_OFFLINE/,
    );
    // Normal rendering keeps its bounded offline fallback. Only access hints
    // require a live request; the gate instead checks the Worker on failure.
    assert.deepEqual(await getPublicSnapshot(file), publicPayload);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("stage11: fresh JSON fetched by gate is reused by the player table", async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = fakeStorage();
  const file = "stage11-reuse-hint-test.json";
  const payload = { accessMode: "public", players: [{ id: 15 }] };
  let count = 0;
  globalThis.fetch = async () => { count += 1; return Response.json(payload); };
  try {
    const gateSnapshot = await getPublicSnapshot(file, { requireNetwork: true });
    const tableSnapshot = await getPublicSnapshot(file, { reuseRecentlyVerified: true });
    assert.deepEqual(gateSnapshot, tableSnapshot);
    assert.equal(count, 1);
    await getPublicSnapshot(file);
    assert.equal(count, 2, "ordinary independent reads still revalidate");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("stage11: server emits mode metadata without codes or sessions", () => {
  const snapshot = source("worker/src/public/publicSnapshot.js");
  const adminAccess = source("worker/src/services/contentAccess.js");
  const client = source("src/features/contentAccess/contentAccessApi.js");
  const worker = source("worker/src/index.js");
  const snapshotWorkflow = source("src/features/players/publicPlayersApi.js");

  assert.match(snapshot, /accessMode: accessSetting\.mode/);
  assert.doesNotMatch(snapshot, /token:\s*accessSetting|session:\s*accessSetting/);
  assert.match(adminAccess, /await markPublicSnapshotDirty\(env\)/);
  assert.match(adminAccess, /current\.mode !== next\.mode/);
  assert.match(client, /requireNetwork:\s*true/);
  assert.match(client, /return requestJson\(/);
  assert.match(worker, /handleContentAccessStatus/);
  assert.match(worker, /getContentAccessState\(request, env, "players"\)/);
  assert.match(snapshotWorkflow, /reuseRecentlyVerified:\s*true/);
});
