import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('header does not advertise dates from an expired manual registration', () => {
  const event = read('src/features/event/useEvent.js');
  assert.match(event, /manualScheduleExpired: manualExpired/);
  assert.match(event, /manualExpired \|\| !displaySchedule\.openAtMs \? null/);
});

test('header copies exist in both locale dictionaries', () => {
  for (const lang of ['uk','en']) {
    const dictionary = JSON.parse(read(`src/i18n/locales/${lang}/ui/header.json`));
    assert.ok(dictionary.registrationNotScheduled);
  }
});
