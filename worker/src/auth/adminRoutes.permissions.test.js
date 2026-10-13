import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { handleAdminSiteSettingsGet } from "../admin/siteSettings.js";
import { handleRegionBackupCreate } from "../admin/regionBackup.js";
import { handleFactoryResetPreview } from "../admin/factoryReset.js";
import { handleAdminTurretPublish } from "../turrets/routes.js";
import { handleAdminImportRegistrations } from "../admin/registrations/import.js";
import { handleAdminContentAccessGet } from "../admin/contentAccess.js";

const env = { FIREBASE_PROJECT_ID: "test-project", DB: { prepare: () => ({ first: async () => null }) } };

function fakeRequest(role, permissions = {}, method = "GET") {
  const payload = Buffer.from(JSON.stringify({ sub: role + "-uid" })).toString("base64url");
  const request = new Request("https://example.invalid/api/admin", {
    method,
    headers: { Authorization: `Bearer a.${payload}.c` },
    ...(method === "GET" ? {} : { body: "{}" }),
  });
  const fields = Object.fromEntries(Object.entries(permissions).map(([key, value]) => [key, { booleanValue: value }]));
  const doc = {
    fields: {
      role: { stringValue: role },
      active: { booleanValue: true },
      permissions: { mapValue: { fields } },
    },
  };
  return { request, doc };
}

async function underAdminIdentity(handler, role, permissions = {}, method = "GET") {
  const oldFetch = globalThis.fetch;
  const { request, doc } = fakeRequest(role, permissions, method);
  globalThis.fetch = async () => new Response(JSON.stringify(doc), { status: 200 });
  try {
    return await handler(request, env);
  } finally {
    globalThis.fetch = oldFetch;
  }
}

test("Consul cannot get or change site appearance from Worker", async () => {
  const response = await underAdminIdentity(handleAdminSiteSettingsGet, "consul");
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "FORBIDDEN");
});

test("Consul cannot back up entire region including Firestore role requests", async () => {
  const response = await underAdminIdentity(handleRegionBackupCreate, "consul");
  assert.equal(response.status, 403);
});

test("Admin cannot perform owner-only factory reset", async () => {
  const response = await underAdminIdentity(handleFactoryResetPreview, "admin");
  assert.equal(response.status, 403);
});

test("Consul with explicitly blocked publish cannot publish plan", async () => {
  const response = await underAdminIdentity(handleAdminTurretPublish, "consul", { publish_final_plan: false }, "POST");
  assert.equal(response.status, 403);
});

test("Consul with explicitly blocked import cannot import", async () => {
  const response = await underAdminIdentity(handleAdminImportRegistrations, "consul", { import_players: false }, "POST");
  assert.equal(response.status, 403);
});

test("Consul with explicitly blocked content management cannot reach controls", async () => {
  const response = await underAdminIdentity(handleAdminContentAccessGet, "consul", { manage_content_access: false });
  assert.equal(response.status, 403);
});

test("Admin can read site appearance without Owner role", async () => {
  const response = await underAdminIdentity(handleAdminSiteSettingsGet, "admin");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});
