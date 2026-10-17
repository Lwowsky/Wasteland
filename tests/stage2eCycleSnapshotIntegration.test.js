import test from 'node:test';
import assert from 'node:assert/strict';
import { getRegistrationCycleSchedule } from '../shared/registrationCycle.js';
import { DEFAULT_REGISTRATION_CYCLE_SETTINGS } from '../shared/registrationConfig.js';
import { getRegistrationCycleKey } from '../worker/src/services/registrationCycle.js';
import { getPublicDisplayPeriod } from '../worker/src/db/periods.js';
import { handlePlayers } from '../worker/src/public/players.js';
import { getPublicVisibilityKey, syncPublicVisibilityRevision } from '../worker/src/services/publicSnapshotSync.js';

const DAY = 86_400_000;
const defaults = DEFAULT_REGISTRATION_CYCLE_SETTINGS;
const clock = Date.parse('2026-10-24T12:00:00.000Z');
const schedule = getRegistrationCycleSchedule(defaults, clock);
const priorSchedule = getRegistrationCycleSchedule(defaults, clock - 14 * DAY);
const makePeriod = (id, dates) => ({
  id, status: 'open', cycle_key: getRegistrationCycleKey(defaults, dates),
  opens_at: dates.opensAt, closes_at: dates.closesAt,
  wasteland_start_at: dates.eventStartAt, wasteland_end_at: dates.eventEndAt,
  rules_snapshot_json: '{"initialized":true}',
});
const nextPeriod = makePeriod(22, schedule);
const oldPeriod = makePeriod(21, priorSchedule);

function database({ periods = [oldPeriod, nextPeriod], players = [], revision = 3, visibleKey = 'none' } = {}) {
  const log = [];
  const state = { revision, visibleKey };
  const DB = {
    prepare(raw) {
      const sql = raw.replace(/\s+/g, ' ').trim();
      const statement = (params = []) => ({
        bind(...values) { return statement(values); },
        async first() {
          log.push({ sql, params });
          if (sql.includes('FROM registration_settings')) return null;
          if (sql.includes('FROM registration_cycle_resets')) return null;
          if (sql.includes('FROM registration_periods') && sql.includes('cycle_key = ?'))
            return periods.find((period) => period.cycle_key === params[0]) ?? null;
          if (sql.includes('FROM registration_periods') && sql.includes('wasteland_end_at > ?')) {
            return periods.filter((period) => period.wasteland_end_at > params[0] && period.opens_at <= params[1])
              .sort((a, b) => b.wasteland_end_at.localeCompare(a.wasteland_end_at))[0] ?? null;
          }
          if (sql.includes('COUNT(*) AS total') && sql.includes('FROM public_players'))
            return { total: players.filter((player) => player.period_id === params[0]).length };
          throw new Error(`Unexpected first query: ${sql}`);
        },
        async all() {
          log.push({ sql, params });
          if (sql.includes('FROM alliance_rotation')) return { results: [] };
          if (sql.includes('FROM public_players') && sql.includes('WHERE period_id = ?')) {
            const [periodId, limit, offset] = params;
            return { results: players.filter((player) => player.period_id === periodId)
              .sort((a, b) => b.id - a.id).slice(offset, offset + limit) };
          }
          throw new Error(`Unexpected all query: ${sql}`);
        },
        async run() {
          log.push({ sql, params });
          if (sql.includes('UPDATE public_snapshot_sync') && sql.includes('visible_period_key <> ?')) {
            if (state.visibleKey === params[1]) return { meta: { changes: 0 } };
            state.visibleKey = params[0]; state.revision += 1;
            return { meta: { changes: 1 } };
          }
          throw new Error(`Unexpected write: ${sql}`);
        },
      });
      return statement();
    },
  };
  return { DB, log, state };
}

test('Stage 2E: a new registration cycle takes precedence over the old one', async () => {
  const env = database();
  const selected = await getPublicDisplayPeriod(env, defaults, clock);
  assert.equal(selected.id, nextPeriod.id);
  assert.notEqual(nextPeriod.cycle_key, oldPeriod.cycle_key);
  assert.ok(env.log.some(({ sql }) => sql.includes('cycle_key = ?')));
});

test('Stage 2E: a completed cycle can remain visible during its 24h grace period', async () => {
  const when = Date.parse(oldPeriod.wasteland_end_at) + 60 * 60 * 1000;
  const env = database({ periods: [oldPeriod] });
  const selected = await getPublicDisplayPeriod(env, defaults, when);
  assert.equal(selected?.id, oldPeriod.id);
  const expired = await getPublicDisplayPeriod(env, defaults, Date.parse(oldPeriod.wasteland_end_at) + DAY + 1000);
  assert.notEqual(expired?.id, oldPeriod.id);
});

test('Stage 2E: public player rows are isolated by cycle ID without deleting older rows', async () => {
  const roster = [
    { id: 1, nickname: 'older cycle', period_id: 21, alliance: 'OLD' },
    { id: 2, nickname: 'new cycle', period_id: 22, alliance: 'NEW' },
  ];
  const env = database({ players: roster });
  const realNow = Date.now;
  Date.now = () => clock;
  let response;
  try {
    response = await handlePlayers(env, new URL('https://example.test/api/players?page=1&limit=500'));
  } finally {
    Date.now = realNow;
  }
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
  assert.deepEqual(body.players.map((player) => player.nickname), ['new cycle']);
  assert.equal(roster.length, 2, 'older D1 records remain until retention cleanup');
  const queries = env.log.filter(({ sql }) => sql.includes('FROM public_players'));
  assert.equal(queries.length, 2);
  assert.ok(queries.every(({ sql, params }) => sql.includes('WHERE period_id = ?') && params[0] === 22));
});

test('Stage 2E: visibility revision changes exactly once per visible-cycle transition', async () => {
  const env = database({ visibleKey: 'none', revision: 9 });
  assert.equal(await syncPublicVisibilityRevision(env, clock), true);
  const afterFirst = env.state.revision;
  assert.equal(await syncPublicVisibilityRevision(env, clock), false);
  assert.equal(env.state.revision, afterFirst);
  assert.equal(getPublicVisibilityKey(null), 'none');
  assert.notEqual(getPublicVisibilityKey(oldPeriod), getPublicVisibilityKey(nextPeriod));
});
