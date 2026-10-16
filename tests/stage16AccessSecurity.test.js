import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('stage16: every access mode change queues snapshot publication', () => {
  const source = read('worker/src/services/contentAccess.js');
  assert.match(source, /if \(current\.mode !== next\.mode\)\s*\{\s*await revokeContentAccess\(env, normalizedResource\);[\s\S]*?await markPublicSnapshotDirty\(env\)/);
});
test('stage16: protected player identities and recent names excluded from public JSON', () => {
  const source = read('worker/src/public/publicSnapshot.js');
  // Initial and latest modes must both be public before snapshot export.
  assert.match(source, /const exposePlayers = accessSetting\.mode === "public" && latestPlayersAccess\.mode === "public"/);
  assert.match(source, /const exposePlan = finalAccess\.mode === "public" && latestPlanAccess\.mode === "public"/);
  assert.match(source, /recentPlayers: exposePlayers \? recent\.map\(publicPlayer\) : \[\]/);
  assert.match(source, /players: exposePlayers \? \(players\.players \|\| \[\]\)\.map\(publicPlayer\) : \[\]/);
  assert.match(source, /plan: exposePlan \? \(published\?\.plan \?\? null\) : null/);
});
test('stage16: live server check is authoritative before rendering protected resources', () => {
  for (const path of ['src/features/players/publicPlayersApi.js', 'src/pages/FinalPlan/services/finalPlanApi.js']) {
    const source = read(path);
    assert.match(source, /await getContentAccessStatus\(/);
    assert.match(source, /if \(!status\.allowed\) throw/);
  }
  assert.match(read('src/features/contentAccess/contentAccessApi.js'), /cache: "no-store"/);
});
