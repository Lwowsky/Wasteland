import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getStaticPublicSettings,
  isPublicRegistrationSettings,
  isPublicSiteSettings,
} from "../src/utils/publicSettingsSnapshot.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const site = {
  success: true,
  settings: { siteName: "Wasteland King", regionNumber: 987, regionName: "We are One" },
};
const registration = {
  success: true,
  enabled: false,
  reason: "REGISTRATION_CLOSED",
  period: { id: 15, opensAt: "2026-10-10T09:00:00Z", closesAt: "2026-10-16T09:00:00Z" },
  settings: { availableShifts: { shift1: true }, publicRegistration: true },
};

test("stage12: accept only the existing public API response shapes", () => {
  assert.equal(isPublicSiteSettings(site), true);
  assert.equal(isPublicSiteSettings({ success: false, settings: site.settings }), false);
  assert.equal(isPublicSiteSettings({ success: true, settings: {} }), false);
  assert.equal(isPublicSiteSettings(null), false);

  assert.equal(isPublicRegistrationSettings(registration), true);
  assert.equal(isPublicRegistrationSettings({ ...registration, enabled: "false" }), false);
  assert.equal(isPublicRegistrationSettings({ ...registration, period: {} }), false);
  assert.equal(isPublicRegistrationSettings({ ...registration, settings: null }), false);
});

test("stage12: normal public settings use GitHub JSON, not Worker", async () => {
  const calls = [];
  const loaded = await getStaticPublicSettings(
    "site-settings.json",
    isPublicSiteSettings,
    {
      enabled: () => true,
      load: async (name, opts) => {
        calls.push({ name, opts });
        return site;
      },
    },
  );
  assert.deepEqual(loaded, site);
  assert.deepEqual(calls, [{ name: "site-settings.json", opts: { requireNetwork: true } }]);
});

test("stage12: no snapshot when disabled, malformed or unreachable", async () => {
  let reads = 0;
  const disabled = await getStaticPublicSettings("site-settings.json", isPublicSiteSettings, {
    enabled: () => false,
    load: async () => { reads += 1; return site; },
  });
  assert.equal(disabled, null);
  assert.equal(reads, 0);

  const malformed = await getStaticPublicSettings("site-settings.json", isPublicSiteSettings, {
    enabled: () => true,
    load: async () => ({ error: "FORBIDDEN" }),
  });
  assert.equal(malformed, null);

  const offline = await getStaticPublicSettings("registration-settings.json", isPublicRegistrationSettings, {
    enabled: () => true,
    load: async () => { throw new Error("NETWORK_DOWN"); },
  });
  assert.equal(offline, null);
});

test("stage12: Worker exports only PUBLIC settings and updates D1 revision after edits", () => {
  const exporter = source("worker/src/public/publicSnapshot.js");
  const siteAdmin = source("worker/src/admin/siteSettings.js");
  const registrationAdmin = source("worker/src/admin/registrationSettings.js");

  assert.match(exporter, /handlePublicSiteSettings\(env\)/);
  assert.match(exporter, /handlePublicRegistrationSettings\(env\)/);
  assert.match(exporter, /\bsiteSettings,\s*registrationSettings,/);
  assert.doesNotMatch(exporter, /handleAdminSiteSettingsGet|handleAdminRegistrationSettingsGet/);
  assert.match(siteAdmin, /await clearPublicCaches\(request, env\)/);
  assert.match(registrationAdmin, /await clearPublicCaches\(request, env\)/);
});

test("stage12: registration form checks live Worker; all other public routes use snapshots", () => {
  const page = source("src/pages/Registration/Registration.jsx");
  const api = source("src/features/registration/registrationApi.js");
  const siteApi = source("src/features/site/siteSettingsApi.js");
  const snapshot = source("src/utils/publicSettingsSnapshot.js");
  const worker = source("worker/src/index.js");

  assert.match(page, /getRegistrationSettings\(\{ serverOnly: true \}\)/);
  assert.match(page, /verified\.loading/);
  assert.match(api, /if \(serverOnly\) return fetchRegistrationSettings\(\)/);
  assert.match(api, /getStaticPublicSettings\(/);
  assert.match(siteApi, /getStaticPublicSettings\(/);
  assert.match(api, /staticSettings \|\| fetchRegistrationSettings\(\)/);
  assert.match(siteApi, /staticSettings \|\| requestJson\(/);
  assert.match(snapshot, /requireNetwork: true/);
  assert.match(worker, /url\.pathname === "\/api\/registration"/);
});
