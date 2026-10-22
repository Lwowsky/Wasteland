import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  filterCaptureRegionRegistrations,
  hasOptedIntoRegionCapture,
  selectCapturePlanRegistrations,
} from '../shared/captureRegions.js';
import { createEmptyAssignments } from '../src/features/turrets/turretAssignments.js';
import { canAutoUsePlayer } from '../src/features/turrets/autoCandidates.js';

const text = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const roster = [
  { id: 1, readyAttack: true, nickname: 'Opted' },
  { id: 2, readyAttack: false, nickname: 'Not opted' },
  { id: 3, readiness: { attack: true }, nickname: 'Legacy opted' },
  { id: 4, readyAttack: false, nickname: 'Manual captain' },
];

test('057: home receives the full roster; capture plans see only explicit opt-ins', () => {
  assert.equal(filterCaptureRegionRegistrations(roster, 'home'), roster);
  assert.deepEqual(filterCaptureRegionRegistrations(roster, 'region2').map(p => p.id), [1, 3]);
  assert.deepEqual(filterCaptureRegionRegistrations(roster, 'region3').map(p => p.id), [1, 3]);
  assert.equal(hasOptedIntoRegionCapture({ readyAttack: 'true' }), false);
  assert.deepEqual(filterCaptureRegionRegistrations(null, 'region2'), []);
});

test('057: existing manual captain/helper are preserved for review, never auto-included', () => {
  const assignments = createEmptyAssignments();
  assignments.shifts.shift1.hub.captainId = '4';
  assignments.shifts.shift1.north.helperIds = ['2'];
  assert.deepEqual(selectCapturePlanRegistrations(roster, 'region2', assignments).map(p => p.id), [1, 3, 2, 4]);
  assert.deepEqual(selectCapturePlanRegistrations(roster, 'home', assignments), roster);
});

test('057: automatic placement never selects a non-opted manual incumbent', () => {
  const assignments = createEmptyAssignments();
  const base = { id: 4, shift: 'shift1', marchSize: 100000, rallySize: 500000, captain: true };
  const args = { assignments, settings: { respectShift: false, onlyCaptains: false, mode: 'balanced' }, shift: 'shift1', purpose: 'captain', roster: new Map() };
  assert.equal(canAutoUsePlayer({ ...args, player: { ...base, captureAutoExcluded: true } }), false);
  assert.equal(canAutoUsePlayer({ ...args, player: { ...base, captureAutoExcluded: false } }), true);
});

test('057: active subtab is owned by the stable parent, not a region-keyed child', () => {
  const tab = text('src/pages/Admin/tabs/TurretDistributionTab.jsx');
  const cycle = text('src/pages/Admin/turrets/TurretDistributionCycle.jsx');
  const plan = text('src/pages/Admin/turrets/useTurretPlan.js');
  assert.match(tab, /const \[section, setSection\] = useState\("settings"\)/);
  assert.match(tab, /section=\{section\} onSectionChange=\{setSection\}/);
  assert.match(cycle, /onChange=\{onSectionChange\}/);
  assert.doesNotMatch(cycle, /const \[section, setSection\] = useState/);
  assert.match(plan, /selectCapturePlanRegistrations/);
  assert.match(plan, /captureAutoExcluded/);
});
