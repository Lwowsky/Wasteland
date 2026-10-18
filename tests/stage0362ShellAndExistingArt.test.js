import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const source = (path) => readFileSync(resolve(path), "utf8");

test("036.2: app layout remains mounted while nested lazy routes load", () => {
  const app = source("src/App.jsx");
  const layout = source("src/layouts/MainLayout.jsx");
  const loader = source("src/components/RouteLoading/RouteLoading.jsx");
  const css = source("src/components/RouteLoading/RouteLoading.css");
  assert.match(app, /import MainLayout from ["']\.\/layouts\/MainLayout\.jsx["']/);
  assert.doesNotMatch(app, /const MainLayout = lazy/);
  assert.match(layout, /<Suspense fallback=\{<RouteLoading\s*\/?>\}>[\s\S]*?<Outlet/);
  assert.match(loader, /<main className="page route-loading"/);
  assert.match(css, /min-height:\s*70svh/);
});

test("036.2: existing WebP assets replace default SVG decoration in confirmations", () => {
  const confirm = source("src/components/ConfirmModal/ConfirmModal.jsx");
  const player = source("src/pages/Admin/players/PlayerEditorModal.jsx");
  const summary = source("src/pages/Admin/tabs/PlayersAdminTab.jsx");
  for (const filename of [
    "/images/admin/icons/actions/delete.webp",
    "/images/registration-settings/warning-icon.webp",
    "/images/admin/icons/actions/no-changes-info.webp",
  ]) {
    assert.equal(existsSync(resolve(`public${filename}`)), true, filename);
    assert.match(confirm, new RegExp(filename.replace(/\./g, "\\.")));
  }
  assert.match(player, /actions\/delete\.webp/);
  assert.match(summary, /warning-icon\.webp/);
  assert.match(confirm, /iconSrc \? <img/); // Existing caller-controlled icon source stays supported.
});

test("036.2: plan signature uses existing PNG artwork, preserves language flags", () => {
  const board = source("src/pages/FinalPlan/components/FinalPlanBoard.jsx");
  assert.match(board, /board-signature-flatflags\.png/);
  assert.doesNotMatch(board, /board-signature-flatflags\.svg/);
  assert.equal(existsSync(resolve("public/images/final-plan/board-signature-flatflags.png")), true);
  for (const language of ["uk", "en"]) {
    assert.equal(existsSync(resolve(`public/images/final-plan/lang/${language}.svg`)), true);
  }
});

test("036.2: administrator F5 restores authorized tab without eager access-list fetch", () => {
  const admin = source("src/pages/Admin/Admin.jsx");
  assert.match(admin, /getSavedTab\(tabStorageIdentity\)/);
  assert.match(admin, /saveTab\(tabStorageIdentity, resolvedActiveTab\)/);
  assert.match(admin, /const needsAccessData = resolvedActiveTab === "access"/);
  assert.match(admin, /const resolvedActiveTab = tabs\.some/);
  assert.match(admin, /sessionStorage\.setItem/);
});
