import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fetchCompleteWorkerPlayers } from '../src/features/players/workerPlayersPagination.js';
import { normalizeRegistrationSettings } from '../src/features/registration/registrationSettings.js';
import { createDefaultRegistrationSettings, saveRegistrationSettings } from '../worker/src/db/registrationSettings.js';

const source = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('049: legacy maxPlayers is ignored for old registration settings and snapshots', () => {
  const settings = normalizeRegistrationSettings({ maxPlayers: 300, publicRegistration: true });
  assert.equal(Object.hasOwn(settings, 'maxPlayers'), false);
});

test('049: current Worker settings no longer read, write or expose max_players', () => {
  for (const file of ['worker/src/db/registrationSettings.js', 'worker/src/admin/registrationSettings.js']) {
    const content = source(file);
    assert.doesNotMatch(content, /maxPlayers|max_players/);
  }
  assert.match(source('worker/migrations/0020_remove_registration_player_cap.sql'), /DROP COLUMN max_players/i);
});

test('049: fetches all protected Worker player pages, not only the first 500', async () => {
  const roster = Array.from({ length: 1207 }, (_, id) => ({ id }));
  const calls = [];
  const all = await fetchCompleteWorkerPlayers(async (page, limit) => {
    calls.push(page);
    return { players: roster.slice((page - 1) * limit, page * limit), total: roster.length };
  });
  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(all.players.length, 1207);
  assert.equal(all.players[1206].id, 1206);
});

test('049: rejects incomplete paginated worker result instead of silently hiding players', async () => {
  await assert.rejects(
    fetchCompleteWorkerPlayers(async (page) => ({ total: 501, players: page === 1 ? Array(500).fill({}) : [] })),
    /INCOMPLETE_PUBLIC_PLAYERS_RESPONSE/,
  );
});

test('049: empty player result remains valid', async () => {
  const response = await fetchCompleteWorkerPlayers(async () => ({ players: [], total: 0 }));
  assert.deepEqual(response.players, []);
});

test('049: no full-registration error path survives; turret caps stay intact', () => {
  assert.doesNotMatch(source('src/pages/Registration/registrationMessages.js'), /REGISTRATION_FULL/);
  assert.match(source('src/features/turrets/shiftCapacity.js'), /MAX_WASTELAND_SHIFT_PLAYERS = 100/);
});


test('049: settings save has matching SQL parameters after dropping obsolete column', async () => {
  let checked = false;
  const env = { DB: {
    prepare(sql) {
      return { bind(...values) {
        if (sql.includes('INSERT INTO registration_settings')) {
          assert.equal((sql.match(/\?/g) || []).length, values.length);
          assert.doesNotMatch(sql, /max_players/);
          checked = true;
        }
        return { run: async () => ({}), all: async () => ({ results: [] }) };
      } };
    },
    batch: async () => [],
  } };
  await saveRegistrationSettings(env, createDefaultRegistrationSettings());
  assert.equal(checked, true);
});
