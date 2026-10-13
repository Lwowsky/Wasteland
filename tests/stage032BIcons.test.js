import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const components = [
  "src/pages/Admin/turrets/TurretDistributionNav.jsx",
  "src/pages/Admin/turrets/DistributionSettings.jsx",
  "src/pages/Admin/turrets/GlobalHelperLimit.jsx",
  "src/pages/Admin/turrets/FlexibleShiftSettings.jsx",
  "src/pages/Admin/turrets/TierMarchSettings.jsx",
  "src/pages/Admin/turrets/TurretActionResultModal.jsx",
  "src/pages/Admin/turrets/TurretDistributionCycle.jsx",
];

test("032B.1: every turret WEBP asset referenced in JSX exists in public", () => {
  let total = 0;
  for (const component of components) {
    const source = readFileSync(join(root, component), "utf8");
    for (const match of source.matchAll(/\/images\/[\w/.-]+\.webp/g)) {
      assert.equal(existsSync(join(root, "public", match[0])), true, `${component}: ${match[0]}`);
      total++;
    }
  }
  assert.ok(total >= 10, "Expected icon assets across the planner and result dialogs");
});

test("032B.2: four new game-style WEBP icons are used in their intended controls", () => {
  const nav = readFileSync(join(root, components[0]), "utf8");
  const settings = readFileSync(join(root, components[1]), "utf8");
  const modal = readFileSync(join(root, components[5]), "utf8");
  assert.match(nav, /id: "final",\s*image: "\/images\/admin\/icons\/final-plan\.webp"/);
  assert.match(settings, /actions\/redistribute-helpers\.webp/);
  assert.match(settings, /actions\/fill-turrets\.webp/);
  assert.match(modal, /info: \{ image: "\/images\/admin\/icons\/actions\/no-changes-info\.webp"/);
  for (const file of [
    "public/images/admin/icons/final-plan.webp",
    "public/images/admin/icons/actions/redistribute-helpers.webp",
    "public/images/admin/icons/actions/fill-turrets.webp",
    "public/images/admin/icons/actions/no-changes-info.webp",
  ]) assert.equal(existsSync(join(root, file)), true, file);
});

test("032B.1: confirmation images are optional and other dialogs retain their existing icons", () => {
  const generic = readFileSync(join(root, "src/components/ConfirmModal/ConfirmModal.jsx"), "utf8");
  assert.match(generic, /iconSrc \? <img/);
  assert.match(generic, /: <Icon size=\{26\}/);
});
