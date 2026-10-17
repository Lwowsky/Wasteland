import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/components/Modal/Modal.css", import.meta.url), "utf8");
const component = readFileSync(new URL("../src/components/Modal/Modal.jsx", import.meta.url), "utf8");
const login = readFileSync(new URL("../src/pages/Auth/Login/Login.css", import.meta.url), "utf8");

// CSS-only regression checks. Visual centering/scrolling is also verified by
// a headless Chromium viewport test before shipping the patch.
test("all shared mobile dialogs center instead of attaching to bottom edge", () => {
  const mobile = css.split("@media (max-width: 760px)")[1].split("@media (max-width: 430px)")[0];
  assert.match(mobile, /\.site-modal-backdrop\s*\{[^}]*align-items:\s*center\s*;/);
  assert.match(mobile, /\.site-modal-backdrop\s*\{[^}]*justify-content:\s*center\s*;/);
  assert.doesNotMatch(mobile, /align-items:\s*flex-end/);
  assert.match(mobile, /\.site-modal\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*24px\)/);
  assert.match(mobile, /border-radius:\s*20px/);
  const narrow = css.split("@media (max-width: 430px)")[1];
  assert.match(narrow, /border-radius:\s*18px\s*;/);
  assert.doesNotMatch(narrow, /border-radius:\s*18px\s+18px\s+0\s+0/);
});

test("long editor content scrolls while header and footer remain visible", () => {
  assert.match(css, /\.site-modal\s*\{[^}]*display:\s*flex\s*;[^}]*flex-direction:\s*column/);
  assert.match(css, /\.site-modal__body\s*\{[^}]*min-height:\s*0\s*;[^}]*overflow-x:\s*hidden\s*;[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.site-modal__header\s*\{[^}]*flex:\s*0\s+0\s+auto/);
  assert.match(css, /\.site-modal__footer\s*\{[^}]*flex:\s*0\s+0\s+auto/);
});

test("shared modal is portaled above the app, and standalone login dialog is centered", () => {
  assert.match(component, /createPortal\(/);
  assert.match(component, /document\.body\s*,/);
  assert.match(login, /\.login-modal-backdrop\s*\{[^}]*align-items:center;justify-content:center/);
});

test("admin auto-sync coalesces focus/visibility bursts without slowing post-write sync", () => {
  const sync = readFileSync(new URL("../src/pages/Admin/hooks/useAdminPlayersData.js", import.meta.url), "utf8");
  assert.match(sync, /const AUTO_CHECK_COOLDOWN_MS = 10_000/);
  assert.match(sync, /now - lastAutoCheckAtRef\.current < AUTO_CHECK_COOLDOWN_MS/);
  assert.match(sync, /window\.addEventListener\("focus", check\)/);
  assert.match(sync, /document\.addEventListener\("visibilitychange", check\)/);
  assert.match(sync, /syncChanges\(\{ afterWrite: true \}\)/);
});
