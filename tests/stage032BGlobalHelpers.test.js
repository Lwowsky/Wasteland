import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { normalizePlannerSettings, updatePlannerSettings } from '../src/features/turrets/plannerSettings.js';
import { getTowerMaxHelpers, updateTowerRule, validTowerRules } from '../src/features/turrets/turretSlotRules.js';
import { createEmptyAssignments, addHelper, getHelperCandidates, findAssignmentConflicts } from '../src/features/turrets/turretAssignments.js';
import { runAutomaticDistribution } from '../src/features/turrets/autoDistribution.js';
import { validateTurretDraft, PlanError } from '../worker/src/turrets/validate.js';

const captain = { id:'1', nickname:'Captain', alliance:'A', shift:'shift1', captain:true, troopType:'fighter', tier:'T14', marchSize:500, rallySize:1000000 };
const helpers = Array.from({length: 5},(_,n)=> ({ id:String(n+2), nickname:`Helper${n}`, alliance:'A', shift:'shift1', captain:false, troopType:'fighter', tier:'T13', marchSize:10000, rallySize:0 }));
const players = [captain, ...helpers];
const initial = () => { const plan=createEmptyAssignments(); plan.shifts.shift1.hub.captainId='1'; return plan; };
const paths = (path) => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('032B: global helper count defaults to 29 and is clamped between 0 and 29',()=>{
  assert.equal(normalizePlannerSettings({}).maxHelpers,29);
  for(const [input,expected] of [[5,5],[0,0],[30,29],[-10,0],[3.9,3]]) {
    assert.equal(updatePlannerSettings(normalizePlannerSettings({}), 'maxHelpers', input).maxHelpers,expected);
  }
});

test('032B: all towers and shifts inherit one cap unless explicitly overridden',()=>{
  const settings=normalizePlannerSettings({maxHelpers:2});
  let plan=initial();
  for(const shift of ['shift1','shift2','shift3','shift4']) for(const tower of ['hub','north','east','west','south'])
    assert.equal(getTowerMaxHelpers(plan,shift,tower,settings),2);
  plan=updateTowerRule(plan,'shift2','west',{maxHelpers:5}).assignments;
  assert.equal(getTowerMaxHelpers(plan,'shift2','west',settings),5);
  assert.equal(getTowerMaxHelpers(plan,'shift1','west',settings),2);
  assert.equal(getTowerMaxHelpers(plan,'shift2','west',normalizePlannerSettings({maxHelpers:1})),5);
});

test('032B: reset one turret restores inherited global cap without losing a captain',()=>{
  let plan=updateTowerRule(initial(),'shift1','hub',{maxHelpers:4}).assignments;
  plan=updateTowerRule(plan,'shift1','hub',{maxHelpers:null}).assignments;
  assert.equal(plan.towerRules.shift1.hub.maxHelpers,undefined);
  assert.equal(getTowerMaxHelpers(plan,'shift1','hub',normalizePlannerSettings({maxHelpers:2})),2);
  assert.equal(plan.shifts.shift1.hub.captainId,'1');
});

test('032B: manual helpers cannot exceed the shared limit, local limit takes precedence',()=>{
  const settings=normalizePlannerSettings({maxHelpers:1, sameTroopType:true});
  let plan=initial();
  plan=addHelper(plan,'shift1','hub','2',players,settings).assignments;
  assert.equal(getHelperCandidates(plan,players,'shift1','hub',settings).length,0);
  assert.equal(addHelper(plan,'shift1','hub','3',players,settings).error,'full');
  plan=updateTowerRule(plan,'shift1','hub',{maxHelpers:3}).assignments;
  assert.ok(addHelper(plan,'shift1','hub','3',players,settings).assignments);
});

test('032B: zero helper capacity blocks new helpers while preserving captain',()=>{
  const settings=normalizePlannerSettings({maxHelpers:0});
  const plan=initial();
  assert.equal(addHelper(plan,'shift1','hub','2',players,settings).error,'full');
  const filled=runAutomaticDistribution({assignments:plan, players,settings,operation:'fill',activeShifts:['shift1']});
  assert.equal(filled.assignments.shifts.shift1.hub.captainId,'1');
  assert.deepEqual(filled.assignments.shifts.shift1.hub.helperIds,[]);
  assert.equal(validTowerRules({shift1:{hub:{maxHelpers:0}}}),true);
});

test('032B: auto fill and redistribution obey cap without relocating manually chosen captains',()=>{
  const settings=normalizePlannerSettings({maxHelpers:2});
  const plan=initial();
  const filled=runAutomaticDistribution({assignments:plan,players,settings,operation:'fill',activeShifts:['shift1']});
  assert.equal(filled.assignments.shifts.shift1.hub.captainId,'1');
  assert.equal(filled.assignments.shifts.shift1.hub.helperIds.length,2);
  const redistributed=runAutomaticDistribution({assignments:filled.assignments,players,settings,operation:'redistribute',activeShifts:['shift1']});
  assert.equal(redistributed.assignments.shifts.shift1.hub.captainId,'1');
  assert.equal(redistributed.assignments.shifts.shift1.hub.helperIds.length,2);
});

test('032B: worker rejects excess global helpers, allows zero, and validates existing over-capacity assignments',()=>{
  const base=initial();
  assert.throws(()=>validateTurretDraft({maxHelpers:30},base,players),(err)=>err instanceof PlanError && err.message==='INVALID_TURRET_DRAFT');
  assert.throws(()=>validateTurretDraft({maxHelpers:-1},base,players),PlanError);
  assert.equal(validateTurretDraft({maxHelpers:0},base,players).count,1);
  const plan=addHelper(base,'shift1','hub','2',players,normalizePlannerSettings({})).assignments;
  assert.equal(findAssignmentConflicts(plan,players,normalizePlannerSettings({maxHelpers:0})).some((c)=>c.reason==='full'),true);
  assert.throws(()=>validateTurretDraft({maxHelpers:0},plan,players),(err)=>err instanceof PlanError && err.message==='TURRET_CAPACITY_EXCEEDED');
  assert.equal(plan.shifts.shift1.hub.captainId,'1');
});

test('032B: UI has one default field, no unused occupancy chart, and translation keys in both languages',()=>{
  const ui=paths('src/pages/Admin/turrets/GlobalHelperLimit.jsx');
  const settings=paths('src/pages/Admin/turrets/FlexibleShiftSettings.jsx');
  assert.match(ui,/settings\.maxHelpers/);
  assert.match(ui,/updatePlannerSettings/);
  assert.doesNotMatch(settings,/SharedAllianceCapacitySummary/);
  for(const file of ['SharedAllianceCapacitySummary.jsx','SharedAllianceCapacitySummary.css'])
    assert.equal(existsSync(new URL(`../src/pages/Admin/turrets/${file}`,import.meta.url)),false);
  for(const lang of ['uk','en']){
    const dict=JSON.parse(paths(`src/i18n/locales/${lang}/admin/distribution.json`));
    for(const key of ['globalHelpersTitle','globalHelpersDescription','globalHelpersLabel','globalHelpersHint'])
      assert.ok(dict.limits[key],`${lang}.${key}`);
    for(const key of ['inheritsGlobal','overridesGlobal'])assert.equal(Object.hasOwn(dict.towerEditor,key),false,`${lang}.${key}`);
  }
});

test('032B: helper default survives a browser workspace refresh',async()=>{
  const {writeTurretWorkspace,readTurretWorkspace} = await import('../src/features/turrets/localTurretWorkspace.js');
  const entries=new Map();
  const storage={setItem:(key,value)=>entries.set(key,value),getItem:(key)=>entries.get(key)};
  const savedSettings=normalizePlannerSettings({maxHelpers:7});
  assert.equal(writeTurretWorkspace(42,'test-owner',{settings:savedSettings,assignments:initial(),baseRevision:0,dirty:true},storage),true);
  const recovered=readTurretWorkspace(42,'test-owner',storage);
  assert.equal(normalizePlannerSettings(recovered.settings).maxHelpers,7);
  assert.equal(getTowerMaxHelpers(recovered.assignments,'shift4','east',recovered.settings),7);
});

test('032B: lowering the default never silently removes an existing captain or helpers', async () => {
  const { normalizeAssignments } = await import('../src/features/turrets/turretAssignments.js');
  let plan = initial();
  plan = addHelper(plan, 'shift1', 'hub', '2', players, normalizePlannerSettings({})).assignments;
  plan = addHelper(plan, 'shift1', 'hub', '3', players, normalizePlannerSettings({})).assignments;
  const newSettings = normalizePlannerSettings({maxHelpers:1});
  const reconciled = normalizeAssignments(plan, players);
  assert.equal(reconciled.shifts.shift1.hub.captainId, '1');
  assert.deepEqual(reconciled.shifts.shift1.hub.helperIds, ['2','3']);
  assert.equal(findAssignmentConflicts(reconciled, players, newSettings).some((x)=>x.reason==='full'),true);
  assert.throws(()=>validateTurretDraft(newSettings,reconciled,players), (error)=>error.message==='TURRET_CAPACITY_EXCEEDED');
});
