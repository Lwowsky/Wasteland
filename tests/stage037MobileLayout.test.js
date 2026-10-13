import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath) => readFileSync(resolve(relativePath), "utf8");

test("037: mobile dialogs scroll as a whole; action footer follows the content", () => {
  const css = read("src/components/Modal/Modal.css");
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.site-modal \{[^}]*overflow-y: auto/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.site-modal__body \{[^}]*flex: 0 0 auto;[^}]*overflow: visible/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.site-modal__footer \{[^}]*position: static/);
});

test("037: registration cycle save icon is an existing game asset", () => {
  const source = read("src/pages/Admin/registration/RegistrationCycleModal.jsx");
  const icon = "/images/admin/icons/actions/approve.webp";
  assert.match(source, /src="\/images\/admin\/icons\/actions\/approve\.webp"/);
  assert.ok(existsSync(resolve(`public${icon}`)));
  assert.doesNotMatch(source, /save\.svg/);
});

test("037: mobile turret limits use two numeric controls per row", () => {
  const css = read("src/pages/Admin/turrets/TurretTowerEditor.css");
  assert.match(css, /@media\(max-width:680px\)\s*\{[^}]*\.turret-tower-limits__fields \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("037: mobile settings header and template title wrap inside viewport", () => {
  const css = read("src/pages/Settings/Settings.responsive.css");
  assert.match(css, /\.settings-header h1 \{[^}]*overflow-wrap: anywhere/);
  assert.match(css, /\.templates-header__title \{[^}]*overflow-wrap: anywhere/);
  assert.match(css, /\.settings-tab \{[^}]*overflow-wrap: anywhere/);
});

test("037: players table preserves room for state badges on small screens", () => {
  const css = read("src/pages/Admin/styles/players/PlayersTable.details.css");
  assert.doesNotMatch(css, /min-width: 940px/);
  assert.match(css, /min-width: 1330px/);
  const importCss = read("src/pages/Admin/styles/players/PlayersTable.responsive.css");
  assert.match(importCss, /min-width: 1510px/);
});

test("037: alliance selection no longer has a cascading setState effect", () => {
  const source = read("src/features/registration/components/PlayerSection.jsx");
  assert.doesNotMatch(source, /\buseEffect\b/);
  assert.match(source, /const manualAllianceActive\s*=\s*!allianceIsListed/);
  assert.match(source, /setManualAllianceRequested\(true\)/);
});
