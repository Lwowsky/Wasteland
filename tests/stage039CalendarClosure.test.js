import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLastCompletedWastelandStart,
  getNextWastelandStart,
  getPublicCycleCloseAtMs,
  getPublicCycleViewState,
  isSnapshotForCycle,
} from '../shared/registrationCycle.js';
import { getDefaultRegistrationCycleDraft } from '../src/pages/Admin/registration/registrationCycleDraft.js';
import { getStandardRegistrationSettings } from '../src/features/registration/registrationSettings.js';
import { isPublicDisplayPeriodVisible } from '../worker/src/db/periods.js';

const at = (date) => Date.parse(date);
const settings = {cycleMode:'automatic', wastelandAnchorAt:'2026-10-03T10:00:00.000Z', wastelandIntervalDays:14,
  registrationCloseMode:'gameDayReset', registrationOpenWeekdayUtc:5, registrationOpenTimeUtc:'00:00'};

// All times UTC, including the shared client-side guard. These tests deliberately
// cover the weekend boundary at seconds resolution; no browser API is needed.
test('Stage 039: the LAST COMPLETED date rolls only after the full 24-hour event, not at start', () => {
  assert.equal(getLastCompletedWastelandStart(settings, at('2026-10-31T10:59:00Z')), '2026-10-17T10:00:00.000Z');
  assert.equal(getLastCompletedWastelandStart(settings, at('2026-11-01T09:59:59Z')), '2026-10-17T10:00:00.000Z');
  assert.equal(getLastCompletedWastelandStart(settings, at('2026-11-01T10:00:00Z')), '2026-10-31T10:00:00.000Z');
  assert.equal(new Date(getNextWastelandStart(at('2026-11-01T10:00:00Z'),settings.wastelandAnchorAt,14)).toISOString(), '2026-11-14T10:00:00.000Z');
  assert.equal(getLastCompletedWastelandStart(settings, at('2027-10-17T10:00:00Z')) !== '2026-10-03T10:00:00.000Z', true);
});

test('Stage 039: reset restores standard options WITHOUT resetting the established anchor', () => {
  const customAnchor='2026-10-10T10:00:00.000Z';
  const draft=getDefaultRegistrationCycleDraft({wastelandAnchorAt:customAnchor});
  assert.equal(draft.wastelandAnchorAt,customAnchor);
  assert.equal(draft.wastelandIntervalDays,14);
  assert.equal(draft.wastelandDurationHours,24);
  const standard=getStandardRegistrationSettings({wastelandAnchorAt:customAnchor, hostAlliance:'TST'});
  assert.equal(standard.wastelandAnchorAt,customAnchor);
  assert.equal(standard.hostAlliance,'TST');
});

test('Stage 039: both pages close at Monday 00:00 UTC, reopen on next registration Friday', () => {
  const cutoff=getPublicCycleCloseAtMs(at('2026-11-01T10:00:00Z'));
  assert.equal(new Date(cutoff).toISOString(),'2026-11-02T00:00:00.000Z');
  const roster={opens_at:'2026-10-23T00:00:00.000Z',wasteland_end_at:'2026-11-01T10:00:00.000Z'};
  assert.equal(isPublicDisplayPeriodVisible(roster,at('2026-11-01T23:59:59Z')),true);
  assert.equal(isPublicDisplayPeriodVisible(roster,at('2026-11-02T00:00:00Z')),false);
  for(const date of ['2026-11-01T23:59:59Z','2026-11-02T00:00:00Z','2026-11-05T23:59:59Z','2026-11-06T00:00:00Z']) {
    const expected=date.includes('11-01')||date.includes('11-06');
    const result=getPublicCycleViewState(settings,at(date));
    assert.equal(result.visible,expected,date);
  }
});

test('Stage 039: closure does not extend non-Saturday manual event more than 24h', () => {
  // A Tuesday event ending Wednesday does not stay visible till next Monday.
  const ending=at('2026-10-21T10:00:00Z');
  assert.equal(getPublicCycleCloseAtMs(ending),ending+24*3600_000);
});

test('Stage 039: client calendar gate never requires Worker, Firestore or D1 for the clock', () => {
  assert.equal(getPublicCycleViewState(settings,at('2026-10-22T23:59:59Z')).state,'closed');
  assert.equal(getPublicCycleViewState(settings,at('2026-10-23T00:00:00Z')).state,'open');
  assert.equal(getPublicCycleViewState(settings,at('2026-11-02T00:00:00Z')).state,'closed');
  // Before the first base event a synthetic prior (Sept 19) cannot be exposed.
  assert.equal(getPublicCycleViewState(settings,at('2026-09-20T10:00:00Z')).visible,false);
});


test('Stage 039: a stale prior-cycle encrypted snapshot is rejected on the new Friday', () => {
  const friday=getPublicCycleViewState(settings,at('2026-11-06T00:00:00Z'));
  assert.equal(friday.state,'open');
  assert.equal(friday.eventStartAt,'2026-11-14T10:00:00.000Z');
  assert.equal(isSnapshotForCycle({cycleEventStartAt:'2026-10-31T10:00:00.000Z'},friday.eventStartAt),false);
  assert.equal(isSnapshotForCycle({cycleEventStartAt:friday.eventStartAt},friday.eventStartAt),true);
  assert.equal(isSnapshotForCycle({sealed:{version:1}},friday.eventStartAt),false);
});
