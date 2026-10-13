import test from "node:test";
import assert from "node:assert/strict";
import { adminHasPermission } from "./adminAuth.js";
import {
  ALL_PERMISSIONS, PERMISSIONS, ROLES, canManageUser, canGrantRole,
  getDefaultPermissionsForRole, sanitizePermissionsForRole,
} from "../../../src/features/auth/permissions.js";

test("Owner only can reset region; Admin otherwise has full role permission set", () => {
  for (const permission of ALL_PERMISSIONS) {
    assert.equal(adminHasPermission({ ok: true, role: ROLES.OWNER }, permission), true);
    assert.equal(adminHasPermission({ ok: true, role: ROLES.ADMIN }, permission), permission !== PERMISSIONS.RESET_REGION);
  }
});

test("Consul can manage players, import, publish and registration but not roles/appearance/reset", () => {
  const allowed = ["view_players", "edit_players", "delete_players", "import_players", "clear_players", "view_distribution", "edit_distribution", "publish_final_plan", "view_registration_settings", "edit_registration_settings", "view_settings", "manage_content_access"];
  const blocked = ["view_access", "manage_access", "manage_consuls", "grant_admin", "view_requests", "manage_requests", "manage_site_appearance", "manage_region_backup", "reset_region"];
  for (const permission of allowed) assert.equal(adminHasPermission({ ok:true, role:ROLES.CONSUL }, permission), true, permission);
  for (const permission of blocked) assert.equal(adminHasPermission({ ok:true, role:ROLES.CONSUL }, permission), false, permission);
});

test("Individual false flags are respected including legacy docs missing new fields", () => {
  assert.equal(adminHasPermission({ ok:true, role: ROLES.CONSUL, permissions: { import_players: false } }, "import_players"), false);
  assert.equal(adminHasPermission({ ok:true, role: ROLES.ADMIN, permissions: { manage_site_appearance: false } }, "manage_site_appearance"), false);
  assert.equal(adminHasPermission({ ok:false, role: ROLES.OWNER }, "reset_region"), false);
  assert.equal(sanitizePermissionsForRole(ROLES.CONSUL, { manage_access: true }).manage_access, false);
  assert.equal(getDefaultPermissionsForRole(ROLES.ADMIN).reset_region, false);
});

test("Admin can manage other Admins, but no one may manage Owner", () => {
  assert.equal(canManageUser(ROLES.ADMIN, ROLES.ADMIN), true);
  assert.equal(canGrantRole(ROLES.ADMIN, ROLES.ADMIN), true);
  assert.equal(canManageUser(ROLES.ADMIN, ROLES.OWNER), false);
  assert.equal(canManageUser(ROLES.CONSUL, ROLES.ADMIN), false);
});
