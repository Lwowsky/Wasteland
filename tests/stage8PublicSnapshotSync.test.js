import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  acknowledgePublicSnapshot,
  dispatchPendingPublicSnapshot,
  hasPublicSnapshotAccess,
} from "../worker/src/services/publicSnapshotSync.js";
import { publicPlayer } from "../worker/src/public/publicSnapshot.js";

function fakeEnv(revision = 3, published = 2) {
  const state = {
    revision,
    published_revision: published,
    dispatched_revision: 0,
    last_dispatch_ms: 0,
  };
  return {
    state,
    GITHUB_SNAPSHOT_DISPATCH_TOKEN: "private-secret",
    GITHUB_SNAPSHOT_REPOSITORY: "Lwowsky/Wasteland-Public-Data",
    DB: {
      prepare(sql) {
        return {
          first: async () => ({ ...state }),
          bind(...values) {
            return {
              run: async () => {
                if (sql.includes("dispatched_revision = MAX")) {
                  state.dispatched_revision = Math.max(
                    state.dispatched_revision,
                    values[0],
                  );
                  state.last_dispatch_ms = values[1];
                }
                if (sql.includes("published_revision = MAX")) {
                  if (state.revision < values[1]) return { meta: { changes: 0 } };
                  state.published_revision = Math.max(
                    state.published_revision,
                    values[0],
                  );
                }
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };
}

test("Stage 8: snapshot is restricted to seven visible player columns plus id", () => {
  const row = {
    id: 10,
    nickname: "Test",
    alliance: "YYY",
    troopType: "fighter",
    tier: "T12",
    shift: "shift1",
    captain: 1,
    createdAt: "2026-10-15 11:22:52",
    marchSize: 473200,
    rallySize: 2599996,
    lairLevel: 51,
    extraShooterTier: "T12",
    comment: "PRIVATE",
  };
  assert.deepEqual(
    Object.keys(publicPlayer(row)).sort(),
    [
      "id",
      "nickname",
      "alliance",
      "troopType",
      "tier",
      "shift",
      "captain",
      "createdAt",
    ].sort(),
  );
  assert.equal(JSON.stringify(publicPlayer(row)).includes("473200"), false);
  assert.equal(JSON.stringify(publicPlayer(row)).includes("PRIVATE"), false);
});

test("Stage 8: only the configured bearer token authorizes public snapshot export/ack", () => {
  const env = { PUBLIC_SNAPSHOT_EXPORT_TOKEN: "sample-key" };
  assert.equal(
    hasPublicSnapshotAccess(
      new Request("https://example.com", {
        headers: { Authorization: "Bearer sample-key" },
      }),
      env,
    ),
    true,
  );
  assert.equal(
    hasPublicSnapshotAccess(
      new Request("https://example.com", {
        headers: { Authorization: "Bearer wrong-key" },
      }),
      env,
    ),
    false,
  );
});

test("Stage 8: one GitHub dispatch per dirty revision, retries if no ack", async () => {
  const env = fakeEnv();
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push({ url, init });
    return new Response(null, { status: 204 });
  };
  assert.equal(
    await dispatchPendingPublicSnapshot(env, { now: 500000, fetcher }),
    "dispatched",
  );
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /Wasteland-Public-Data\/dispatches$/);
  assert.equal(
    JSON.parse(requests[0].init.body).event_type,
    "public_snapshot_changed",
  );
  assert.equal(
    await dispatchPendingPublicSnapshot(env, { now: 510000, fetcher }),
    "waiting",
  );
  assert.equal(
    await dispatchPendingPublicSnapshot(env, { now: 740001, fetcher }),
    "dispatched",
  );
  assert.equal(await acknowledgePublicSnapshot(env, 3), true);
  assert.equal(
    await dispatchPendingPublicSnapshot(env, { now: 800000, fetcher }),
    "up-to-date",
  );
});

test("Stage 8: changes during deploy cannot be acknowledged as published", async () => {
  const env = fakeEnv(4, 2);
  await acknowledgePublicSnapshot(env, 3);
  assert.equal(env.state.published_revision, 3);
  const calls = [];
  assert.equal(
    await dispatchPendingPublicSnapshot(env, {
      now: 700000,
      fetcher: async (...args) => {
        calls.push(args);
        return new Response(null, { status: 204 });
      },
    }),
    "dispatched",
  );
  assert.equal(calls.length, 1);
});

test("Stage 8: React site workflow does not fetch snapshots or schedule full builds", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    workflow,
    /repository_dispatch|schedule:|public-snapshot|snapshot.json/,
  );
  assert.match(workflow, /on:\s*\n {2}push:/);
});

test("Stage 8: unsuccessful dispatch keeps D1 dirty for retry", async () => {
  const env = fakeEnv();
  await assert.rejects(
    dispatchPendingPublicSnapshot(env, {
      now: 500000,
      fetcher: async () => new Response("Forbidden", { status: 403 }),
    }),
    /GITHUB_DISPATCH_FAILED_403/,
  );
  assert.equal(env.state.dispatched_revision, 0);
  assert.equal(env.state.last_dispatch_ms, 0);
});

test("Stage 8: public data changes are flagged by existing cache invalidation hook", () => {
  const cache = readFileSync(
    new URL("../worker/src/utils/cache.js", import.meta.url),
    "utf8",
  );
  const paths = [
    "worker/src/public/registration.js",
    "worker/src/admin/registrations/create.js",
    "worker/src/admin/registrations/update.js",
    "worker/src/admin/registrations/clear.js",
    "worker/src/admin/registrations/import.js",
    "worker/src/admin/registrations/afterWrite.js",
    "worker/src/admin/registrationSettings.js",
    "worker/src/admin/factoryReset.js",
    "worker/src/admin/regionBackup.js",
  ];
  assert.match(cache, /await markPublicSnapshotDirty\(env\)/);
  for (const path of paths) {
    const fileUrl = new URL(`../${path}`, import.meta.url);
    assert.match(
      readFileSync(fileUrl, "utf8"),
      /clearPublicCaches\(request, env\)/,
      path,
    );
  }
});

test("Stage 050: priority cycle dispatch skips normal 2-minute delay but remains rate-bounded", async () => {
  const env = fakeEnv(5, 4);
  const calls = [];
  const fetcher = async (...args) => {
    calls.push(args);
    return new Response(null, { status: 204 });
  };
  assert.equal(await dispatchPendingPublicSnapshot(env, { now: 600000, fetcher }), "dispatched");
  // Admin opens a NEW cycle; a newer revision should go out promptly.
  env.state.revision = 6;
  assert.equal(await dispatchPendingPublicSnapshot(env, { now: 610000, fetcher, priority: true }), "waiting");
  assert.equal(await dispatchPendingPublicSnapshot(env, { now: 616000, fetcher, priority: true }), "dispatched");
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1][1].body).client_payload.revision, 6);
});
