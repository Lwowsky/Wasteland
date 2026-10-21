import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANGUAGELESS_ROUTE_ALIASES, ROUTES, resolveLanguageFreeRoute } from "../src/config/routes.js";
import { auditPublishedSnapshot } from "../worker/src/public/snapshotAudit.js";
import { buildSafeSnapshotPlayers } from "../worker/src/public/publicSnapshot.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 042: every application route supports a prefix-free URL, including singular player", () => {
  const targets = [ROUTES.registration, ROUTES.players, ROUTES.finalPlan,
    ROUTES.settings, "login", "access-denied", ROUTES.admin];
  for (const path of targets) {
    assert.equal(resolveLanguageFreeRoute(path), path);
  }
  assert.equal(resolveLanguageFreeRoute("player"), ROUTES.players);
  assert.equal(resolveLanguageFreeRoute("s"), null);
  assert.equal(resolveLanguageFreeRoute("missing"), null);
  assert.equal(resolveLanguageFreeRoute("__proto__"), null);
  assert.ok(Object.keys(LANGUAGELESS_ROUTE_ALIASES).length >= targets.length);
});

test("Stage 042: canonical redirects preserve links and remain client-side", () => {
  const app = read("src/App.jsx");
  const redirect = read("src/features/routing/PreferredLanguageRedirect.jsx");
  const share = read("src/features/contentAccess/StaticShareRedirect.jsx");
  assert.match(app, /Object\.entries\(LANGUAGELESS_ROUTE_ALIASES\)/);
  assert.match(app, /path="\/s\/:shortCode"/);
  assert.match(app, /path="player"/);
  assert.match(redirect, /resolvePreferredLanguage/);
  assert.match(redirect, /search: location\.search/);
  assert.match(redirect, /hash: location\.hash/);
  assert.doesNotMatch(redirect, /requestJson|fetch\(|adminRequest/);
  assert.match(share, /\?access=/);
});

test("Stage 042: public mode is selectable independently on both resource tabs", () => {
  const editor = read("src/pages/Admin/settings/ContentAccessEditor.jsx");
  const backend = read("worker/src/services/contentAccess.js");
  const panel = read("src/pages/Admin/settings/ContentAccessPanel.jsx");
  assert.match(editor, /<option value="public">/);
  assert.match(editor, /<option value="private">/);
  assert.match(editor, /<option value="link">/);
  assert.doesNotMatch(editor, /<option value="public" disabled>/);
  assert.match(backend, /\["public", "private", "link"\]\.includes\(payload\.mode\)/);
  assert.match(backend, /revokeContentAccess\(env, normalizedResource\)/);
  assert.match(panel, /const RESOURCES = \["players", "final_plan"\]/);
  assert.match(panel, /\["public", "private", "link"\]\.includes\(resource\?\.mode\)/);
});

test("Stage 042: plaintext public snapshots keep only allowed player fields", () => {
  const players = buildSafeSnapshotPlayers({ players: [
    { id: 7, nickname: "Player", alliance: "AAA", tier: "T10", marchSize: 500,
      rallySize: 1000, secretToken: "PRIVATE", captain: true },
  ] }, "public", [], true);
  assert.equal(players.players.length, 1);
  assert.equal(players.players[0].nickname, "Player");
  assert.equal(players.players[0].secretToken, undefined);
  assert.equal(players.players[0].marchSize, undefined);
  assert.equal(players.players[0].rallySize, undefined);
  assert.deepEqual(auditPublishedSnapshot({
    revision: { revision: 1 }, summary: { recentPlayers: [] }, players,
    finalPlan: { accessMode: "public", plan: null },
  }), []);
});

test("Stage 042: protected modes remain encrypted or empty", () => {
  const players = buildSafeSnapshotPlayers({ players: [{ nickname: "Private" }] }, "private", [], false);
  assert.equal(players.players.length, 0);
  const backend = read("worker/src/public/publicSnapshot.js");
  assert.match(backend, /exposePlayers = isSnapshotPublic/);
  assert.match(backend, /exposePlan = isSnapshotPublic/);
  assert.match(backend, /UNENCRYPTED_LINK_EXPORT/);
});
