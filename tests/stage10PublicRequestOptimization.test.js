import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clearPublicSettingsCache,
  loadPublicSettings,
} from "../src/utils/publicSettingsCache.js";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
  };
}

test("stage10+13: public route and menu do not eagerly import Firebase admin auth", () => {
  const header = read("src/components/Header/Header.jsx");
  const burger = read("src/components/BurgerMenu/BurgerMenu.jsx");
  const adminLink = read("src/components/BurgerMenu/AdminMenuLink.jsx");
  const adminRoute = read("src/features/auth/AdminRoute.jsx");
  const menuHint = read("src/features/auth/adminMenuHint.js");

  assert.doesNotMatch(header, /useAdminAuth/);
  assert.doesNotMatch(burger, /useAdminAuth/);
  assert.match(burger, /lazy\(\(\) => import\("\.\/AdminMenuLink\.jsx"\)\)/);
  // Stage 13: the menu uses a UI-only hint, NOT a Firebase admin check.
  assert.match(adminLink, /hasAdminMenuHint\(\)/);
  assert.doesNotMatch(adminLink, /useAdminAuth|firebase\/|getDoc\(/);
  assert.doesNotMatch(menuHint, /firebase\/|getDoc\(/);
  // The actual admin route still verifies credentials and permissions.
  assert.match(adminRoute, /const \{ user, admin, loading \} = useAdminAuth\(\)/);
});

test("stage10+51: private mode denies unauthorized Worker access and static links do not activate sessions", () => {
  const gate = read("src/features/contentAccess/ContentAccessGate.jsx");
  const server = read("worker/src/services/contentAccess.js");
  const worker = read("worker/src/index.js");

  assert.match(gate, /getContentAccessStatus\(resource\)/);
  assert.match(gate, /getPublicContentAccessHint\(resource/);
  assert.doesNotMatch(gate, /activateContentAccess|submitCode/);
  assert.match(server, /allowed: setting\.mode === "public"/);
  assert.doesNotMatch(server, /hasValidSession|function activateContentAccess/);
  assert.match(worker, /handleContentAccessStatus/);
  assert.match(worker, /getContentAccessState\(request, env, "players"\)/);
});

test("stage10: browser caches apply only to public site and registration settings", () => {
  const site = read("src/features/site/siteSettingsApi.js");
  const registration = read("src/features/registration/registrationApi.js");
  const protectedApi = read("src/features/contentAccess/contentAccessApi.js");

  assert.match(site, /loadPublicSettings\(/);
  assert.match(registration, /loadPublicSettings\(/);
  assert.match(registration, /clearPublicSettingsCache\(SETTINGS_CACHE_KEY\)/);
  assert.doesNotMatch(protectedApi, /loadPublicSettings|readCrossTabCache/);
});

test("stage10: deduplicates concurrent requests, caches across tabs and can invalidate", async () => {
  const oldSession = globalThis.sessionStorage;
  const oldLocal = globalThis.localStorage;
  const oldNow = Date.now;
  globalThis.sessionStorage = memoryStorage();
  globalThis.localStorage = memoryStorage();
  let now = 300000;
  Date.now = () => now;

  const key = "stage10-cache-test";
  let count = 0;
  const load = async () => {
    count += 1;
    await Promise.resolve();
    return { success: true, settings: { regionName: "Example" } };
  };

  try {
    const [first, second] = await Promise.all([
      loadPublicSettings({ key, ttlMs: 60000, load }),
      loadPublicSettings({ key, ttlMs: 60000, load }),
    ]);
    assert.deepEqual(first, second);
    assert.equal(count, 1);

    // Simulate a second tab with empty sessionStorage on the same origin.
    globalThis.sessionStorage = memoryStorage();
    now += 1000;
    const inSecondTab = await loadPublicSettings({ key, ttlMs: 60000, load });
    assert.deepEqual(inSecondTab, first);
    assert.equal(count, 1);

    now += 61000;
    await loadPublicSettings({ key, ttlMs: 60000, load });
    assert.equal(count, 2);

    clearPublicSettingsCache(key);
    await loadPublicSettings({ key, ttlMs: 60000, load });
    assert.equal(count, 3);

    await loadPublicSettings({ key, ttlMs: 60000, force: true, load });
    assert.equal(count, 4);
  } finally {
    clearPublicSettingsCache(key);
    Date.now = oldNow;
    if (oldSession === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = oldSession;
    if (oldLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldLocal;
  }
});

test("stage10: failed settings requests are not cached", async () => {
  const oldSession = globalThis.sessionStorage;
  const oldLocal = globalThis.localStorage;
  globalThis.sessionStorage = memoryStorage();
  globalThis.localStorage = memoryStorage();
  const key = "stage10-cache-retry";
  let attempts = 0;

  try {
    await assert.rejects(loadPublicSettings({
      key,
      ttlMs: 30000,
      load: () => { attempts += 1; throw new Error("NETWORK_DOWN"); },
    }), /NETWORK_DOWN/);
    const success = await loadPublicSettings({
      key,
      ttlMs: 30000,
      load: () => { attempts += 1; return { success: true }; },
    });
    assert.deepEqual(success, { success: true });
    assert.equal(attempts, 2);
  } finally {
    clearPublicSettingsCache(key);
    if (oldSession === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = oldSession;
    if (oldLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldLocal;
  }
});
