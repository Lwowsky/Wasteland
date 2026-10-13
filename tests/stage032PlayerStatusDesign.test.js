import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { cssSelectors } from "../scripts/audit-code-css.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const status = readFileSync(join(root, "src/pages/Admin/turrets/PlayerStatus.jsx"), "utf8");
const css = readFileSync(join(root, "src/pages/Admin/turrets/PlayerStatus.css"), "utf8");
const mainCss = readFileSync(join(root, "src/pages/Admin/turrets/TurretDistribution.css"), "utf8");

const cardAssets = [
  "/images/turrets/tower-turret.webp",
  "/images/admin/icons/actions/players.webp",
];

test("032 status: three illustrated cards use existing public WEBP assets", () => {
  for (const asset of cardAssets) {
    assert.ok(status.includes(asset), asset);
    assert.equal(existsSync(join(root, "public", asset.slice(1))), true, asset);
  }
  assert.match(status, /loaded \? summary\[key\] : "—"/);
  for (const key of ["assigned", "reserve", "total"]) {
    assert.ok(status.includes(`"${key}"`), key);
  }
});

test("032 status: cards stay compact with readable labels and numbers", () => {
  assert.match(css, /\.turret-status-card\s*\{[^}]+min-height:\s*126px/);
  assert.match(css, /\.turret-status-card__image img\s*\{[^}]+object-fit:\s*contain/);
  assert.match(css, /\.turret-status-card__label\s*\{[^}]+font-size:\s*17px/);
  assert.match(css, /\.turret-status-card__number\s*\{[^}]+font-size:\s*clamp\(32px/);
});

test("032 status: table fills available sector with narrower actions and larger fonts", () => {
  assert.match(css, /\.turret-status-scroll\s*\{[^}]+width:\s*100%/);
  assert.match(css, /\.turret-status-table\s*\{[^}]+grid-template-columns:[^}]+128px/);
  assert.match(css, /\.turret-status-table\s*\{[^}]+font-size:\s*14px/);
  assert.match(css, /\.turret-status-player\s*\{[^}]+font-size:\s*16px/);
  assert.match(css, /\.turret-status-reserve-btn\s*\{[^}]+max-width:\s*120px/);
  assert.doesNotMatch(mainCss, /\.turret-status-table\s*\{/);
});

test("032 status: uses shared troop/tier badges without adding translation strings", () => {
  assert.match(status, /import TierBadge from/);
  assert.match(status, /import TroopBadge from/);
  assert.match(status, /<TroopBadge type=\{p\.troopType\} label=\{a\.troops\[p\.troopType\]\} compact/);
  assert.match(status, /<TierBadge tier=\{p\.tier\} compact/);
  assert.match(status, /\{s\[label\]\}/);
  assert.match(status, /\{s\[detail\]\}/);
});

test("032 status: reserve action and filters keep original behavior", () => {
  assert.match(status, /removeAssignedPlayer\(assignments, player\.id\)/);
  assert.match(status, /disabled=\{!editable \|\| !loaded\} onClick=\{\(\) => toReserve\(p\)\}/);
  assert.match(status, /setQuery\(event\.target\.value\); setPage\(1\)/);
  assert.match(status, /getAssignmentSummary\(assignments, players\)/);
  assert.match(status, /filterPlayerStatus\(players, assignments/);
  assert.match(status, /getAssignmentSummary/);
});

test("032 status: only the table scrolls horizontally on small screens", () => {
  assert.match(css, /\.turret-status-scroll\s*\{[^}]+overflow-x:\s*auto/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /\.turret-status-cards\s*\{\s*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(mainCss, /\.turret-player-status\s*\{[^}]+overflow-x:\s*auto/);
});

test("032 status: no repeated CSS selector scopes in status module", () => {
  const entries = cssSelectors(css);
  const seen = new Set();
  for (const entry of entries) {
    const key = `${entry.context}:${entry.selector}`;
    assert.equal(seen.has(key), false, key);
    seen.add(key);
  }
});
