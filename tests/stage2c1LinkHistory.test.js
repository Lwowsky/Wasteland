import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
test('Stage 2C.1: archived link deletion is restricted by server-side checks', () => {
  const source = read('worker/src/services/staticShareLinks.js');
  assert.match(source, /if \(!inactive\) throw new Error\("CONTENT_LINK_ACTIVE"\)/);
  assert.match(source, /DELETE FROM static_share_links/);
  assert.match(source, /revoked_at IS NOT NULL OR \(expires_at IS NOT NULL AND expires_at <= \?\)/);
});
test('Stage 2C.1: deletion uses existing owner/admin authorization', () => {
  const source = read('worker/src/admin/contentAccess.js');
  assert.match(source, /\["owner", "admin"\]/);
  assert.match(source, /deleteSingleInactiveStaticLink/);
});
test('Stage 2C.1: link list does not use two-column access options grid', () => {
  const source = read('src/pages/Admin/settings/ContentAccessEditor.jsx');
  assert.match(source, /settings-access-link-list/);
  assert.match(source, /deleteOne\(link.id\)/);
});
