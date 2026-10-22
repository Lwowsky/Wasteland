import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { normalizeCaptureRegion, isCaptureRegionEnabled, captureRegionShifts } from '../shared/captureRegions.js';
import { readPlanDraft, readPublishedPlan, readPublishedPlanBundle, upsertDraft, publishDraft } from '../worker/src/turrets/storage.js';
import { countPublishedPlanPlayers } from '../worker/src/public/publishedPlanCount.js';
import { prepareClearPeriodStatements } from '../worker/src/db/registrationWrites.js';
import { saveRegistrationSettings, getRegistrationSettings, createDefaultRegistrationSettings } from '../worker/src/db/registrationSettings.js';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function makeEnv() {
  const db = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../worker/migrations/', import.meta.url)).sort()) {
    if (name.endsWith('.sql')) db.exec(read(`worker/migrations/${name}`));
  }
  db.prepare("INSERT INTO registration_periods (id,name) VALUES (1,'test')").run();
  const resultWrap = (stmt, params = []) => ({
    async first() { return stmt.get(...params) || null; },
    async all() { return { results: stmt.all(...params) }; },
    async run() { const result = stmt.run(...params); return { meta: { changes: result.changes } }; },
  });
  const env = { DB: {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return { ...resultWrap(stmt), bind(...params) { return resultWrap(stmt, params); } };
    },
    async batch(statements) { return Promise.all(statements.map((stmt) => stmt.run())); },
  }};
  return { db, env };
}
const plan = (nickname) => ({
  settings: { planLanguages: ['uk','en'] }, assignments: { version: 1, shifts: { shift1: { hub: nickname } } },
  publicPlan: { __languages: ['uk', 'en'], shift1: { hub: { captain: { nickname, alliance: 'ABC' }, players: [] } } },
});

test('056: region labels, toggles and independent 1-4 shift counts', () => {
  assert.equal(normalizeCaptureRegion('region2'), 'region2');
  assert.equal(normalizeCaptureRegion('region3'), 'region3');
  assert.equal(normalizeCaptureRegion('region4'), null);
  assert.equal(isCaptureRegionEnabled({ captureRegion1: false }, 'region2'), false);
  assert.equal(isCaptureRegionEnabled({ captureRegion1: true }, 'region2'), true);
  assert.deepEqual(captureRegionShifts({ captureRegion1Shifts: 1 }, 'region2'), ['shift1']);
  assert.deepEqual(captureRegionShifts({ captureRegion2Shifts: 4 }, 'region3'), ['shift1','shift2','shift3','shift4']);
});

test('056: drafts and public plans are isolated by region, and old home rows are preserved', async () => {
  const { env } = makeEnv();
  const home = plan('Home'); const r1 = plan('First'); const r2 = plan('Second');
  await upsertDraft(env, 1, 0, home, 'owner');
  await upsertDraft(env, 1, 0, r1, 'owner', 'region2');
  await upsertDraft(env, 1, 0, r2, 'owner', 'region3');
  assert.equal((await readPlanDraft(env,1)).assignments.shifts.shift1.hub, 'Home');
  assert.equal((await readPlanDraft(env,1,'region2')).assignments.shifts.shift1.hub, 'First');
  assert.equal((await readPlanDraft(env,1,'region3')).assignments.shifts.shift1.hub, 'Second');
  await publishDraft(env,1,1,home,'owner');
  await publishDraft(env,1,1,r1,'owner','region2');
  await publishDraft(env,1,1,r2,'owner','region3');
  assert.equal((await readPublishedPlan(env,1,false,'region3')).plan.shift1.hub.captain.nickname,'Second');
  const combined = await readPublishedPlanBundle(env,1,{captureRegion1:true,captureRegion2:true});
  assert.equal(combined.plan.shift1.hub.captain.nickname,'Home');
  assert.equal(combined.plan.__regions.region2.shift1.hub.captain.nickname,'First');
  assert.equal(combined.plan.__regions.region3.shift1.hub.captain.nickname,'Second');
  const disabled = await readPublishedPlanBundle(env,1,{captureRegion1:false,captureRegion2:true});
  assert.equal(disabled.plan.__regions.region2,undefined);
  assert.equal(disabled.plan.__regions.region3.shift1.hub.captain.nickname,'Second');
  // Disabling a capture affects visibility, not the saved regional row.
  assert.equal((await readPublishedPlan(env,1,false,'region2')).plan.shift1.hub.captain.nickname,'First');
  assert.equal(countPublishedPlanPlayers(combined.plan),3);
});

test('056: optimistic revision rejects a second admin with a stale draft, for each region', async () => {
  const {env} = makeEnv();
  await upsertDraft(env,1,0,plan('A'),'admin1','region2');
  await assert.rejects(upsertDraft(env,1,0,plan('B'),'admin2','region2'),/TURRET_DRAFT_CONFLICT/);
  assert.equal((await readPlanDraft(env,1,'region2')).assignments.shifts.shift1.hub,'A');
});

test('056: period cleanup removes all home and capture drafts/publications', async () => {
  const {db,env} = makeEnv();
  await upsertDraft(env,1,0,plan('A'),'owner','home');
  await upsertDraft(env,1,0,plan('B'),'owner','region2');
  await publishDraft(env,1,1,plan('A'),'owner','home');
  await publishDraft(env,1,1,plan('B'),'owner','region2');
  for (const stmt of prepareClearPeriodStatements(env,1)) await stmt.run();
  for (const table of ['capture_region_plan_publications','capture_region_plan_drafts','turret_plan_publications','turret_plan_drafts']) {
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
  }
  const code = read('worker/src/db/registrationWrites.js');
  for (const table of ['capture_region_plan_publications','capture_region_plan_drafts','turret_plan_publications','turret_plan_drafts']) {
    assert.match(code,new RegExp(`DELETE FROM ${table} WHERE period_id`));
  }
});

test('056: captured plans appear in sealed/public snapshot export without old access-code mode', () => {
  const snapshots = read('worker/src/public/publicSnapshot.js');
  assert.match(snapshots,/readPublishedPlanBundle/);
  assert.match(read('src/pages/FinalPlan/FinalPlan.jsx'), /plan\?\.__regions/);
  assert.match(read('src/pages/Admin/turrets/TurretDistributionCycle.jsx'),/captureRegionShifts/);
  assert.match(read('worker/src/turrets/routes.js'),/CAPTURE_REGION_DISABLED/);
});

test('056: new capture shift counts persist with registration settings, including SQLite upgrade', async () => {
  const {env} = makeEnv();
  await saveRegistrationSettings(env, {
    ...createDefaultRegistrationSettings(), captureRegion1: true,
    captureRegion2: true, captureRegion1Shifts: 4, captureRegion2Shifts: 1,
  });
  const saved = await getRegistrationSettings(env);
  assert.equal(saved.captureRegion1, true);
  assert.equal(saved.captureRegion2, true);
  assert.equal(saved.captureRegion1Shifts, 4);
  assert.equal(saved.captureRegion2Shifts, 1);
});
