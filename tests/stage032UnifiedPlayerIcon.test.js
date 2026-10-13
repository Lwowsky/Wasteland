import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const icon = "/images/admin/icons/actions/players.webp";
const obsoleteIcons = [
  "/images/admin/icons/players.webp",
  "/images/admin/icons/users-count.webp",
  "/images/admin/region-editor/players.webp",
];
const consumers = [
  "src/pages/Admin/turrets/PlayerStatus.jsx",
  "src/pages/Admin/turrets/TurretDistributionNav.jsx",
  "src/pages/Admin/turrets/GlobalHelperLimit.jsx",
  "src/pages/Admin/players/PlayersStatsCards.jsx",
  "src/pages/Admin/access/AccessOverviewCards.jsx",
  "src/pages/Admin/components/AdminTabs.jsx",
  "src/pages/Admin/regionEditor/RegionEditorTabs.jsx",
  "src/pages/Admin/regionEditor/AlliancesEditorTab.jsx",
  "src/pages/Admin/settings/ContentAccessPanel.jsx",
  "src/pages/Admin/tabs/PlayersAdminTab.jsx",
];

test("032: all group-of-players visuals use one bright WEBP asset", () => {
  const source = join(root, "public", icon.slice(1));
  assert.ok(existsSync(source));
  const header = readFileSync(source).subarray(0, 12);
  assert.equal(header.toString("ascii", 0, 4), "RIFF");
  assert.equal(header.toString("ascii", 8, 12), "WEBP");
  for (const file of consumers) {
    const contents = readFileSync(join(root, file), "utf8");
    assert.ok(contents.includes(icon), file);
    for (const old of obsoleteIcons) {
      assert.ok(!contents.includes(old), `${file} still references ${old}`);
    }
  }
});

test("032: shadowed or duplicate people icons are removed, not merely hidden", () => {
  for (const asset of obsoleteIcons) {
    assert.equal(existsSync(join(root, "public", asset.slice(1))), false, asset);
  }
});

test("032: status reserve and total cards show the same canonical icon", () => {
  const source = readFileSync(join(root, "src/pages/Admin/turrets/PlayerStatus.jsx"), "utf8");
  assert.match(source, /\["reserve",\s*"reserve",\s*"notAssigned",\s*"\/images\/admin\/icons\/actions\/players\.webp"\]/);
  assert.match(source, /\["total",\s*"total",\s*"allPlayers",\s*"\/images\/admin\/icons\/actions\/players\.webp"\]/);
});
