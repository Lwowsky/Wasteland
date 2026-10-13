import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPlayersImportPreview,
  buildSuggestedMapping,
  getImportValueGroups,
  getUnmappedHeaders,
  makeImportCustomFieldId,
  normalizeImportShift,
  normalizeImportTier,
  normalizeImportTroop,
} from "../src/pages/Admin/utils/importPlayers.js";

const HEADERS = [
  "Player name",
  "Alliance",
  "Army",
  "Tier",
  "Shift",
  "Captain",
  "Ready to attack",
  "Power",
];

const MAPPING = {
  nickname: "Player name",
  alliance: "Alliance",
  troopType: "Army",
  tier: "Tier",
  shift: "Shift",
  captain: "Captain",
  readyAttack: "Ready to attack",
  custom_power: "Power",
};

function row(rowNumber, values) {
  return { rowNumber, values };
}

test("import: troop, shift and tier aliases normalize multilingual spreadsheet values", () => {
  assert.equal(normalizeImportTroop("Бійці"), "fighter");
  assert.equal(normalizeImportTroop("cavalry"), "rider");
  assert.equal(normalizeImportShift("2nd shift"), "shift2");
  assert.equal(normalizeImportShift("будь-яка зміна"), "flexible");
  assert.equal(normalizeImportTier("тір 12"), "T12");
  assert.equal(normalizeImportTier("тир 11"), "T11");
  assert.equal(normalizeImportTier("T_9"), "T9");
});

test("import: suggested mapping recognizes standard and custom headers", () => {
  const mapping = buildSuggestedMapping(HEADERS, [
    { id: "custom_power", label: "Power" },
  ]);

  assert.equal(mapping.nickname, "Player name");
  assert.equal(mapping.alliance, "Alliance");
  assert.equal(mapping.troopType, "Army");
  assert.equal(mapping.custom_power, "Power");
});

test("import: preview imports valid rows and normalizes alliance/booleans/custom fields", () => {
  const fileData = {
    fileName: "players.xlsx",
    headers: HEADERS,
    rows: [
      row(2, {
        "Player name": " Alpha ",
        Alliance: "zlo",
        Army: "fighters",
        Tier: "12",
        Shift: "1st shift",
        Captain: "yes",
        "Ready to attack": "так",
        Power: "999",
      }),
    ],
  };

  const preview = buildPlayersImportPreview({
    fileData,
    mapping: MAPPING,
    customTargets: [{ id: "custom_power", label: "Power" }],
  });

  assert.equal(preview.total, 1);
  assert.equal(preview.valid, 1);
  assert.equal(preview.invalid, 0);
  assert.equal(preview.duplicates, 0);
  assert.deepEqual(preview.rows[0].player, {
    nickname: "Alpha",
    alliance: "ZLO",
    troopType: "fighter",
    tier: "T12",
    lairLevel: 0,
    marchSize: 0,
    rallySize: 0,
    shift: "shift1",
    captain: true,
    readyAttack: true,
    extraSquads: {
      fighter: { enabled: false, tier: "T10" },
      rider: { enabled: false, tier: "T10" },
      shooter: { enabled: false, tier: "T10" },
    },
    comment: "",
    customFields: { custom_power: "999" },
  });
});

test("import: invalid enum values are reported instead of silently accepted", () => {
  const fileData = {
    fileName: "players.xlsx",
    headers: HEADERS,
    rows: [
      row(2, {
        "Player name": "Alpha",
        Alliance: "ZLO",
        Army: "unknown troop",
        Tier: "T99",
        Shift: "night",
        Captain: "maybe",
        "Ready to attack": "maybe",
      }),
    ],
  };

  const preview = buildPlayersImportPreview({ fileData, mapping: MAPPING });

  assert.equal(preview.valid, 0);
  assert.equal(preview.invalid, 1);
  assert.deepEqual(preview.rows[0].issues.sort(), [
    "captain",
    "readyAttack",
    "shift",
    "tier",
    "troopType",
  ]);
});

test("import: duplicate nicknames are detected against database and inside the same file", () => {
  const makeValues = (nickname) => ({
    "Player name": nickname,
    Alliance: "ZLO",
    Army: "fighter",
    Tier: "T10",
    Shift: "shift1",
    Captain: "no",
    "Ready to attack": "yes",
  });
  const fileData = {
    fileName: "players.xlsx",
    headers: HEADERS,
    rows: [
      row(2, makeValues("Existing")),
      row(3, makeValues("NewOne")),
      row(4, makeValues("newone")),
    ],
  };

  const preview = buildPlayersImportPreview({
    fileData,
    mapping: MAPPING,
    existingPlayers: [{ nickname: "existing" }],
  });

  assert.equal(preview.duplicates, 2);
  assert.equal(preview.rows[0].duplicate, "existing");
  assert.equal(preview.rows[1].duplicate, "");
  assert.equal(preview.rows[2].duplicate, "file");
});

test("import: manual value mappings can resolve non-standard spreadsheet values", () => {
  const fileData = {
    fileName: "players.xlsx",
    headers: HEADERS,
    rows: [
      row(2, {
        "Player name": "Alpha",
        Alliance: "ZLO",
        Army: "F",
        Tier: "XII",
        Shift: "evening",
        Captain: "C",
        "Ready to attack": "R",
      }),
    ],
  };
  const valueMappings = {
    troopType: { f: "fighter" },
    tier: { xii: "T12" },
    shift: { evening: "shift2" },
    captain: { c: "true" },
    readyAttack: { r: "true" },
  };

  const preview = buildPlayersImportPreview({
    fileData,
    mapping: MAPPING,
    valueMappings,
  });

  assert.equal(preview.valid, 1);
  assert.equal(preview.rows[0].player.troopType, "fighter");
  assert.equal(preview.rows[0].player.tier, "T12");
  assert.equal(preview.rows[0].player.shift, "shift2");
  assert.equal(preview.rows[0].player.captain, true);
});

test("import: value groups are unique and expose automatic/resolved values", () => {
  const fileData = {
    rows: [
      row(2, { Army: "fighters", Tier: "12", Shift: "1" }),
      row(3, { Army: "Fighters", Tier: "T12", Shift: "1" }),
    ],
  };
  const groups = getImportValueGroups({
    fileData,
    mapping: { troopType: "Army", tier: "Tier", shift: "Shift" },
  });

  assert.equal(groups.troopType.length, 1);
  assert.equal(groups.troopType[0].resolved, "fighter");
  assert.deepEqual(
    groups.tier.map((item) => item.resolved),
    ["T12", "T12"],
  );
});

test("import: unmapped headers and generated custom ids remain deterministic", () => {
  assert.deepEqual(getUnmappedHeaders(HEADERS, MAPPING), []);
  assert.equal(makeImportCustomFieldId("Player Power"), "import_playerpower");
  assert.equal(
    makeImportCustomFieldId("Player Power", ["import_playerpower"]),
    "import_playerpower_2",
  );
});
