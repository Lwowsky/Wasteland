import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const action = "src/pages/Admin/turrets/FlexibleShiftSettings.jsx";
const shared = "src/pages/Admin/turrets/TurretWorkspaceStatus.jsx";
const iconPaths = [
  "/images/admin/icons/actions/approve.webp",
  "/images/admin/icons/actions/redistribute-helpers.webp",
  "/images/registration-settings/warning-icon.webp",
  "/images/admin/icons/actions/edit.webp",
  "/images/admin/icons/settings/players-import.webp",
  "/images/admin/icons/settings/players-export.webp",
];

test("032B.3: all action and shared status icons already exist in public", () => {
  for (const path of iconPaths) {
    assert.equal(existsSync(join(root, "public", path)), true, path);
    assert.ok(read(action).includes(path) || read(shared).includes(path), path);
  }
});

test("032B.3: shift actions use graphic icons and retain their original handlers", () => {
  const source = read(action);
  assert.match(source, /approve\.webp/);
  assert.match(source, /redistribute-helpers\.webp/);
  assert.match(source, /onClick=\{apply\}/);
  assert.match(source, /onClick=\{restore\}/);
  assert.match(source, /disabled=\{disabled \|\| allocated\.length === 0\}/);
  assert.match(read("src/pages/Admin/turrets/DistributionLimits.css"), /\.planner-section-actions__icon\s*\{/);
});

test("032B.3: cloud status uses appropriate graphics without changing actions", () => {
  const source = read(shared);
  assert.match(source, /actions\/approve\.webp/);
  assert.match(source, /actions\/edit\.webp/);
  assert.match(source, /warning-icon\.webp/);
  assert.match(source, /players-import\.webp/);
  assert.match(source, /players-export\.webp/);
  assert.match(source, /sync\.reloadShared\(\)/);
  assert.match(source, /onClick=\{sync\.saveShared\}/);
  assert.match(source, /<LoaderCircle size=\{16\}/);
  assert.match(read("src/pages/Admin/turrets/TurretWorkspaceStatus.css"), /\.turret-workspace-status__icon\s*\{/);
});
