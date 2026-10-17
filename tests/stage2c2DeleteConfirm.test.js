import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('Stage 2C.2: D1 delete must verify changed rows and missing record', () => {
  const source = read('worker/src/services/staticShareLinks.js');
  assert.match(source, /deleted\.meta\?\.changes/);
  assert.match(source, /CONTENT_LINK_DELETE_NOT_APPLIED/);
  assert.match(source, /SELECT id FROM static_share_links WHERE id = \? AND resource = \?/);
});
test('Stage 2C.2: confirmation uses site modal, never native browser confirm', () => {
  const source = read('src/pages/Admin/settings/ContentAccessPanel.jsx');
  assert.match(source, /<ConfirmModal/);
  assert.doesNotMatch(source, /window\.confirm\(/);
  assert.match(source, /setPendingDelete\(null\)/);
});
test('Stage 2C.2: confirmation strings exist in both translations', () => {
  for (const language of ['en','uk']) {
    const document = JSON.parse(read(`src/i18n/locales/${language}/admin/settings.json`));
    const serialized = JSON.stringify(document);
    assert.match(serialized, /deleteTitle/);
  }
});
