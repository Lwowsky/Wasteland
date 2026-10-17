import test from "node:test";
import assert from "node:assert/strict";
import { acknowledgePublicSnapshot, dispatchPendingPublicSnapshot } from "../worker/src/services/publicSnapshotSync.js";

function envWithRevision(revision, published_revision = 0) {
  const state = { revision, published_revision, dispatched_revision: revision, last_dispatch_ms: 0 };
  return {
    state,
    GITHUB_SNAPSHOT_DISPATCH_TOKEN: "test-key",
    GITHUB_SNAPSHOT_REPOSITORY: "Lwowsky/Wasteland-Public-Data",
    DB: {
      prepare(sql) {
        return {
          first: async () => ({ ...state }),
          bind(...args) {
            return {
              run: async () => {
                if (sql.includes("published_revision = MAX")) {
                  if (state.revision < args[1]) return { meta: { changes: 0 } };
                  state.published_revision = Math.max(state.published_revision, args[0]);
                  return { meta: { changes: 1 } };
                }
                if (sql.includes("dispatched_revision = MAX")) {
                  state.dispatched_revision = Math.max(state.dispatched_revision, args[0]);
                  state.last_dispatch_ms = args[1];
                  return { meta: { changes: 1 } };
                }
                throw new Error(`Unexpected query: ${sql}`);
              },
            };
          },
        };
      },
    },
  };
}

test("Stage 2F: cannot acknowledge a future revision", async () => {
  const env = envWithRevision(12, 10);
  assert.equal(await acknowledgePublicSnapshot(env, 13), false);
  assert.equal(env.state.published_revision, 10);
  assert.equal(await acknowledgePublicSnapshot(env, 0), false);
  assert.equal(await acknowledgePublicSnapshot(env, 1.5), false);
});

test("Stage 2F: stale ack cannot hide a newer dirty revision", async () => {
  const env = envWithRevision(14, 11);
  assert.equal(await acknowledgePublicSnapshot(env, 12), true);
  assert.equal(env.state.published_revision, 12);
  assert.equal(await acknowledgePublicSnapshot(env, 11), true);
  assert.equal(env.state.published_revision, 12);
  const calls = [];
  assert.equal(await dispatchPendingPublicSnapshot(env, {
    now: 500000,
    fetcher: async (...args) => { calls.push(args); return new Response(null, { status: 204 }); },
  }), "dispatched");
  assert.equal(JSON.parse(calls[0][1].body).client_payload.revision, 14);
});

test("Stage 2F: only an acknowledged current revision stops retries", async () => {
  const env = envWithRevision(8, 7);
  assert.equal(await acknowledgePublicSnapshot(env, 8), true);
  assert.equal(await dispatchPendingPublicSnapshot(env), "up-to-date");
});
