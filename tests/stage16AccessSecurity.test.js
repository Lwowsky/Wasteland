import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('stage16: every access mode change queues snapshot publication', () => {
  const source = read('worker/src/services/contentAccess.js');
  assert.match(source, /if \(current\.mode !== next\.mode\)\s*\{\s*await revokeContentAccess\(env, normalizedResource\);[\s\S]*?await markPublicSnapshotDirty\(env\)/);
});
test('stage16: protected player table stays redacted, while home preview is public', () => {
  const source = read('worker/src/public/publicSnapshot.js');
  // Public is exported normally; link mode deliberately exposes only whitelisted view data.
  // Closed and legacy code modes remain redacted.
  assert.match(source, /const exposePlayers = isSnapshotPublic\(accessSetting, latestPlayersAccess\)/);
  assert.match(source, /const exposePlan = isSnapshotPublic\(finalAccess, latestPlanAccess\)/);
  assert.match(source, /recentPlayers: getPublicRecentRegistrations\(recent\)/);
  assert.match(source, /players: exposePlayers \? \(players\.players \|\| \[\]\)\.map\(publicPlayer\) : \[\]/);
  assert.match(source, /plan: exposePlan \? \(published\?\.plan \?\? null\) : null/);
});
test('stage16: live server check is authoritative before rendering protected resources', () => {
  for (const path of ['src/features/players/publicPlayersApi.js', 'src/pages/FinalPlan/services/finalPlanApi.js']) {
    const source = read(path);
    // When static snapshots are disabled, the live Worker remains the fallback.
    assert.match(source, /await getContentAccessStatus\(/);
    // Public static reads are allowed only after checking access status.
    // Optional chaining is intentional: absent status must fail closed.
    assert.match(source, /if \(!status\?\.allowed\) throw new Error\(status\?\.reason \|\| "CONTENT_ACCESS_REQUIRED"\)/);
    assert.match(source, /await getPublicContentAccessHint\(/);
  }
  assert.match(read('src/features/contentAccess/contentAccessApi.js'), /cache: "no-store"/);
});
