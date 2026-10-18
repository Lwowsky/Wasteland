import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sealSnapshotForLinks, openSnapshotFromLink } from "../shared/sealedSnapshot.js";
import { guardSensitiveRequest } from "../worker/src/utils/requestGuard.js";

const code1 = "abcdefghijk12345";
const code2 = "ABCDEFGHJKL12345";
const publicPlayers = { total: 2, players: [{ nickname: "SECRET_NICKNAME_1" }, { nickname: "SECRET_NICKNAME_2" }] };

test("Stage 038: one ciphertext, multiple independently wrapped keys, no leaked player names or raw codes", async () => {
  const result = await sealSnapshotForLinks("players", publicPlayers,
    [{ code: code1, expiresAt: null }, { code: code2, expiresAt: null }]);
  assert.equal(result.sealed.version, 1);
  assert.equal(result.shareLinks.length, 2);
  const raw = JSON.stringify(result);
  assert.doesNotMatch(raw, /SECRET_NICKNAME|abcdefghijk12345|ABCDEFGHJKL12345/);
  assert.deepEqual(await openSnapshotFromLink("players", result.sealed, result.shareLinks[0], code1), publicPlayers);
  assert.deepEqual(await openSnapshotFromLink("players", result.sealed, result.shareLinks[1], code2), publicPlayers);
  await assert.rejects(openSnapshotFromLink("players", result.sealed, result.shareLinks[0], code2));
  await assert.rejects(openSnapshotFromLink("final_plan", result.sealed, result.shareLinks[0], code1));
  const tampered = { ...result.sealed, ciphertext: result.sealed.ciphertext.slice(0, -2) + "AA" };
  await assert.rejects(openSnapshotFromLink("players", tampered, result.shareLinks[0], code1));
});

test("Stage 038: revoked link has no wrapping key in next revision, still-active links work", async () => {
  const first = await sealSnapshotForLinks("players", publicPlayers, [{code:code1}, {code:code2}]);
  const revised = await sealSnapshotForLinks("players", {total: 1, players:[{nickname:"NEW"}]}, [{code:code2}]);
  const json = JSON.stringify(revised);
  assert.equal(revised.shareLinks.length, 1);
  assert.ok(!json.includes(first.shareLinks[0].hash));
  assert.deepEqual((await openSnapshotFromLink("players", revised.sealed, revised.shareLinks[0], code2)).players,
    [{nickname:"NEW"}]);
});

test("Stage 038: fail closed for malformed, expired and wrong-link payloads", async () => {
  const expired = await sealSnapshotForLinks("final_plan", {plan:{secret:"SECRET_PLAN"}},
    [{code:code1, expiresAt:"2020-01-01T00:00:00Z"}]);
  await assert.rejects(openSnapshotFromLink("final_plan", expired.sealed, expired.shareLinks[0], code1), /EXPIRED/);
  await assert.rejects(sealSnapshotForLinks("players", {}, [{code:"short"}]), /SHARE_CODE/);
});

test("Stage 038: route throttling stops rejected login without any D1 query", async () => {
  let calls = 0;
  const env = { SHARED_LOGIN_RATE_LIMIT: { async limit({key}) {
    calls++;
    assert.match(key, /^sharedLogin:[0-9a-f]{64}$/);
    return { success: calls < 2 };
  } } };
  const request = new Request("https://example.com/api/shared-consul/login", { method:"POST",
    headers: {"CF-Connecting-IP":"198.51.100.1", "User-Agent":"Test"}, body:"{}" });
  assert.equal(await guardSensitiveRequest(request, env, "sharedLogin"), null);
  const response = await guardSensitiveRequest(request, env, "sharedLogin");
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal((await response.json()).error, "RATE_LIMITED");
  assert.equal(calls, 2);
});

test("Stage 038: missing limiter never silently disables protection", async () => {
  const request = new Request("https://example.com/api/registration", {method:"POST",body:"{}"});
  assert.equal((await guardSensitiveRequest(request, {}, "registration")).status, 503);
});

test("Stage 038: link-only snapshots cannot include plaintext in protected mode", () => {
  const snapshot = readFileSync(new URL("../worker/src/public/publicSnapshot.js", import.meta.url),"utf8");
  assert.match(snapshot, /exposePlayers = isSnapshotPublic/);
  assert.match(snapshot, /exposePlan = isSnapshotPublic/);
  assert.match(snapshot, /UNENCRYPTED_LINK_EXPORT/);
  assert.match(snapshot, /sealed: encryptedPlan\?\.sealed/);
});
