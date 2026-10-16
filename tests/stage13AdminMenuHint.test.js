import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  hasAdminMenuHint,
  setAdminMenuHint,
} from "../src/features/auth/adminMenuHint.js";

function fakeSessionStorage() {
  const entries = new Map();
  return {
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { entries.set(key, String(value)); },
    removeItem(key) { entries.delete(key); },
  };
}

function withFakeStorage(callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const storage = fakeSessionStorage();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  });
  try { return callback(storage); }
  finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  }
}

test("Stage 13: menu access is invisible until authoritative admin check stores a hint", () => {
  withFakeStorage(() => {
    assert.equal(hasAdminMenuHint(), false);
    setAdminMenuHint(true);
    assert.equal(hasAdminMenuHint(), true);
    setAdminMenuHint(false);
    assert.equal(hasAdminMenuHint(), false);
  });
});

test("Stage 13: malformed, expired and future-dated hints cannot show the admin link", () => {
  withFakeStorage((storage) => {
    const key = "wasteland-admin-menu-hint-v1";
    storage.setItem(key, "invalid json");
    assert.equal(hasAdminMenuHint(), false);
    storage.setItem(key, JSON.stringify({ allowed: true, verifiedAt: Date.now() - 13 * 60 * 60 * 1000 }));
    assert.equal(hasAdminMenuHint(), false);
    storage.setItem(key, JSON.stringify({ allowed: true, verifiedAt: Date.now() + 60_000 }));
    assert.equal(hasAdminMenuHint(), false);
  });
});

test("Stage 13: sessionStorage blocked by browser does not break the menu", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get() { throw new Error("blocked"); },
  });
  try {
    assert.equal(hasAdminMenuHint(), false);
    assert.doesNotThrow(() => setAdminMenuHint(true));
    assert.doesNotThrow(() => setAdminMenuHint(false));
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  }
});

test("Stage 13: public menu does not import Firebase/Firestore administration checks", () => {
  const menu = readFileSync(new URL("../src/components/BurgerMenu/AdminMenuLink.jsx", import.meta.url), "utf8");
  const gate = readFileSync(new URL("../src/features/auth/AdminRoute.jsx", import.meta.url), "utf8");
  const check = readFileSync(new URL("../src/features/auth/useAdminAuth.js", import.meta.url), "utf8");
  const logout = readFileSync(new URL("../src/features/auth/logout.js", import.meta.url), "utf8");
  const shared = readFileSync(new URL("../src/features/auth/sharedConsulClient.js", import.meta.url), "utf8");

  assert.match(menu, /hasAdminMenuHint/);
  assert.doesNotMatch(menu, /useAdminAuth|firebase\/|getDoc\(/);
  assert.match(gate, /useAdminAuth/);
  assert.match(check, /getDoc\(adminRef\)/);
  assert.match(check, /setAdminMenuHint\(true\)/);
  assert.match(check, /setAdminMenuHint\(false\)/);
  assert.match(logout, /setAdminMenuHint\(false\)/);
  assert.match(shared, /setAdminMenuHint\(false\)/);
});
