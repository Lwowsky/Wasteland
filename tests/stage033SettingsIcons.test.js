import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

import { SETTINGS_ICONS } from "../src/pages/Settings/settingsIconPaths.js";

const root = process.cwd();
const source = (relative) => readFileSync(join(root, relative), "utf8");

test("settings icons refer to existing WEBP assets", () => {
  assert.equal(Object.keys(SETTINGS_ICONS).length, 6);
  for (const [name, url] of Object.entries(SETTINGS_ICONS)) {
    assert.ok(url.startsWith("/images/") && url.endsWith(".webp"), name);
    assert.ok(existsSync(join(root, "public", url.slice(1))), `${name}: ${url}`);
  }
});

test("three new settings icons are connected to their corresponding cards", () => {
  const jsx = source("src/pages/Settings/components/GeneralSettingsTab.jsx");
  for (const key of ["language", "timeMode", "timeZone", "reset"]) {
    assert.ok(jsx.includes(`SETTINGS_ICONS.${key}`), key);
  }
  assert.doesNotMatch(jsx, /<(Languages|Clock3|MapPin|RotateCcw)\b/);
});

test("settings header and both tab icons reuse existing site assets", () => {
  const jsx = source("src/pages/Settings/Settings.jsx");
  assert.match(jsx, /SETTINGS_ICONS\.settings/);
  assert.match(jsx, /SETTINGS_ICONS\.templates/);
  assert.match(jsx, /className="settings-tab__icon"/);
});

test("settings icons have image sizing styles in the CSS", () => {
  const css = source("src/pages/Settings/Settings.core.css");
  for (const selector of [
    ".settings-header__icon img",
    ".settings-tab__icon",
    ".settings-card__icon img",
    ".settings-reset__image",
  ]) {
    assert.ok(css.includes(`${selector} {`), selector);
  }
});
