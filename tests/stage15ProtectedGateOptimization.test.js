import test from 'node:test';
import assert from 'node:assert/strict';
import { publicGateStatusFromSnapshot as derive } from '../src/features/contentAccess/publicGateStatusFromSnapshot.js';

for (const resource of ['players', 'final_plan']) {
  test(`stage15: ${resource} public metadata grants only explicitly public content`, () => {
    assert.deepEqual(derive(resource, { success: true, accessMode: 'public' }),
      { resource, mode: 'public', allowed: true, reason: null });
    assert.equal(derive(resource, { accessMode: 'public' }), null);
    assert.equal(derive(resource, { success: false, accessMode: 'public' }), null);
    assert.equal(derive(resource, { success: true, accessMode: 'unexpected' }), null);
  });
  test(`stage15: ${resource} anonymous protected modes show gate without granting access`, () => {
    for (const mode of ['code', 'link', 'private']) {
      const result = derive(resource, { success: true, accessMode: mode }, false);
      assert.equal(result.allowed, false);
      assert.equal(result.mode, mode);
      assert.equal(derive(resource, { success: true, accessMode: mode }, true), null,
        'existing sessions must be validated server-side');
    }
  });
}
