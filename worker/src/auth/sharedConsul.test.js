import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedPermissions, handleSharedLogin, sharedConsulAuth } from './sharedConsul.js';

function fakeDb(key = null, session = null) {
  return { prepare(sql) { return {
    bind(...params) { this.params = params; return this; },
    async first() {
      if (sql.includes('FROM shared_consul_keys')) return key;
      if (sql.includes('FROM shared_consul_sessions')) return session;
      return null;
    },
  }; } };
}

test('shared consul has only player, import, export-screen and turret edit permissions', () => {
  const permissions = sharedPermissions();
  assert.equal(permissions.view_players, true);
  assert.equal(permissions.import_players, true);
  assert.equal(permissions.edit_distribution, true);
  assert.equal(permissions.view_settings, true);
  for (const permission of ['manage_access','clear_players','manage_site_appearance','manage_region_backup','publish_final_plan','edit_registration_settings','reset_region','grant_admin']) {
    assert.equal(permissions[permission], false, permission);
  }
});

test('unconfigured password never authenticates', async () => {
  const request = new Request('https://example.invalid/api/shared-consul/login',{method:'POST',body:JSON.stringify({password:'a'.repeat(64)})});
  const result=await handleSharedLogin(request,{DB:fakeDb()});
  assert.equal(result.status,401);
});

test('revoked or expired shared sessions are rejected', async () => {
  const request=new Request('https://example.invalid/api/admin/registrations',{headers:{Authorization:'Bearer shared_some-token'}});
  const result=await sharedConsulAuth(request,{DB:fakeDb(null,null)});
  assert.equal(result.ok,false);
  assert.equal(result.status,401);
});
