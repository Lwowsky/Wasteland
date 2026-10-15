import assert from "node:assert/strict";
import test from "node:test";

import {
  annotateLocalImportRows,
  buildDraftRows,
  getImportedLocalIds,
  toggleVisibleLocalSelection,
} from "../src/pages/Admin/players/localPlayerImportRows.js";

const player = (nickname, overrides = {}) => ({
  nickname,
  alliance: "MIR",
  troopType: "fighter",
  tier: "T12",
  shift: "shift1",
  captain: false,
  readyAttack: true,
  ...overrides,
});
const row = (id, nickname, overrides = {}, imported = false) => ({
  localId: id,
  player: player(nickname, overrides),
  imported,
});

test("stage 5: no local draft yields no rows", () => {
  assert.deepEqual(buildDraftRows(null, {}, []), []);
  assert.deepEqual(buildDraftRows({ fileData: {} }, {}, []), []);
});

test("stage 5: already staged rows are preserved without recalculation", () => {
  const stagedRows = [row("one", "Alpha")];
  assert.strictEqual(buildDraftRows({ stagedRows }, {}, []), stagedRows);
});

test("stage 5: legacy import drafts keep row IDs and configured/custom field mapping", () => {
  const draft = {
    fileData: {
      fileName: "players.csv",
      headers: ["Name", "Alliance", "Army", "Tier", "Shift", "Captain", "Ready", "Power", "Note"],
      rows: [{
        rowNumber: 7,
        values: {
          Name: " Legacy ", Alliance: "mir", Army: "fighter", Tier: "T12",
          Shift: "shift1", Captain: "yes", Ready: "no", Power: "99", Note: "keep",
        },
      }],
    },
    mapping: {
      nickname: "Name", alliance: "Alliance", troopType: "Army", tier: "Tier",
      shift: "Shift", captain: "Captain", readyAttack: "Ready",
      custom_power: "Power", manual_note: "Note",
    },
    manualFields: [{ id: "manual_note", label: "Note" }],
  };
  const result = buildDraftRows(draft, {
    customFields: [{ id: "custom_power", label: "Power" }],
  }, []);
  assert.equal(result.length, 1);
  assert.equal(result[0].localId, "legacy-7");
  assert.equal(result[0].rowNumber, 7);
  assert.equal(result[0].imported, false);
  assert.equal(result[0].player.nickname, "Legacy");
  assert.deepEqual(result[0].player.customFields, { custom_power: "99", manual_note: "keep" });
});

test("stage 5: local duplicates take priority over existing D1 duplicates without blocking first row", () => {
  const originals = [row("a", " Alpha "), row("b", "alpha"), row("c", "Bravo")];
  const existing = [player("ALPHA")];
  const snapshot = structuredClone(originals);
  const result = annotateLocalImportRows(originals, existing);
  assert.deepEqual(result.map((entry) => entry.duplicate), ["existing", "local", ""]);
  assert.deepEqual(result.map((entry) => entry.ready), [true, false, true]);
  assert.equal(result[0].player.__localDuplicate, "existing");
  assert.equal(result[1].player.__localReady, false);
  assert.equal(result[0].player.id, "a");
  assert.deepEqual(originals, snapshot);
});

test("stage 5: incomplete and already imported rows cannot be transferred", () => {
  const result = annotateLocalImportRows([
    row("imported", "Done", {}, true),
    row("invalid", "", { troopType: "unknown", captain: null }),
    row("ready", "Ready"),
  ], []);
  assert.deepEqual(result.map((item) => item.ready), [false, false, true]);
  assert.deepEqual(result[1].issues, ["nickname", "troopType", "captain"]);
  assert.equal(result[0].player.__localImported, true);
});

test("stage 5: toggling visible ready rows keeps hidden and ineligible selections unchanged", () => {
  const before = new Set(["hidden", "not-ready"]);
  const visible = [
    { __localId: "a", __localReady: true },
    { __localId: "b", __localReady: true },
    { __localId: "not-ready", __localReady: false },
  ];
  const first = toggleVisibleLocalSelection(before, visible);
  assert.deepEqual([...first].sort(), ["a", "b", "hidden", "not-ready"]);
  const second = toggleVisibleLocalSelection(first, visible);
  assert.deepEqual([...second].sort(), ["hidden", "not-ready"]);
  assert.deepEqual([...before].sort(), ["hidden", "not-ready"]);
  assert.notStrictEqual(first, before);
});

test("stage 5: empty visible selection leaves the set unchanged", () => {
  const selected = new Set(["one"]);
  const next = toggleVisibleLocalSelection(selected, []);
  assert.deepEqual([...next], ["one"]);
  assert.notStrictEqual(next, selected);
});

test("stage 5: add mode leaves existing D1 duplicates out of imported IDs", () => {
  const targets = [
    { localId: "existing", duplicate: "existing" },
    { localId: "local", duplicate: "local" },
    { localId: "new", duplicate: "" },
  ];
  assert.deepEqual([...getImportedLocalIds("add", targets, [])], ["local", "new"]);
});

test("stage 5: both replacement modes mark the whole ready list as transferred", () => {
  const targets = [{ localId: "selected" }];
  const ready = [{ localId: "first" }, { localId: "second" }];
  for (const mode of ["replacePeriod", "replacePeriodAndClose"]) {
    assert.deepEqual([...getImportedLocalIds(mode, targets, ready)], ["first", "second"]);
  }
});
