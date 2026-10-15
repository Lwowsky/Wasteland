import {
  IMPORT_VALUE_OPTIONS,
  PLAYER_IMPORT_FIELDS,
} from "./importPlayersConfig.js";
import {
  clean,
  makeImportValueKey,
  makeImportNicknameKey,
  matchHeader,
  normalizedCompact,
  normalizeImportBoolean,
  normalizeImportShift,
  normalizeImportTier,
  normalizeImportTroop,
  toNumber,
} from "./importPlayersNormalization.js";

export { IMPORT_VALUE_OPTIONS, PLAYER_IMPORT_FIELDS };
export {
  makeImportValueKey,
  normalizeImportShift,
  normalizeImportTier,
  normalizeImportTroop,
  toNumber,
} from "./importPlayersNormalization.js";
export { readPlayersImportFile } from "./readPlayersImportFile.js";
export { getImportValueGroups } from "./importPlayersValueGroups.js";

function resolveMappedBoolean(rawValue, valueMappings, field) {
  if (rawValue === undefined) return false;

  const override = getValueOverride(valueMappings, field, rawValue);
  const resolved = override || normalizeImportBoolean(rawValue);

  if (resolved === "true") return true;
  if (resolved === "false") return false;
  return null;
}

function parseExtraSquadTier(value) {
  const tier = normalizeImportTier(value);
  const valid = /^T(?:[1-9]|1[0-4])$/.test(tier);
  return {
    enabled: valid,
    tier: valid ? tier : "T10",
  };
}

function getMappedValue(row, mapping, field) {
  const header = mapping?.[field];
  return header ? row[header] : undefined;
}

function getValueOverride(valueMappings, field, rawValue) {
  const fieldMap = valueMappings?.[field];
  if (!fieldMap || typeof fieldMap !== "object") return "";
  return fieldMap[makeImportValueKey(rawValue)] || "";
}

function resolveMappedEnum(rawValue, valueMappings, field, normalizer) {
  const override = getValueOverride(valueMappings, field, rawValue);
  return override || normalizer(rawValue);
}

export function buildSuggestedMapping(headers, customFields = []) {
  const mapping = {};

  for (const header of headers) {
    const field = matchHeader(header);
    if (field && !mapping[field]) {
      mapping[field] = header;
    }
  }

  for (const field of customFields) {
    const label = clean(field.label);
    if (!label || mapping[field.id]) continue;

    const matched = headers.find(
      (header) => normalizedCompact(header) === normalizedCompact(label),
    );

    if (matched) mapping[field.id] = matched;
  }

  return mapping;
}

function rowToPlayer(row, mapping, customTargets = [], valueMappings = {}) {
  const values = row.values;
  const customFields = {};

  for (const target of customTargets) {
    const header = mapping?.[target.id];
    if (!header) continue;
    customFields[target.id] = clean(values[header]);
  }

  const rawTroopType = getMappedValue(values, mapping, "troopType");
  const rawTier = getMappedValue(values, mapping, "tier");
  const rawShift = getMappedValue(values, mapping, "shift");

  return {
    nickname: clean(getMappedValue(values, mapping, "nickname")),
    alliance: clean(getMappedValue(values, mapping, "alliance")).toUpperCase(),
    troopType: resolveMappedEnum(
      rawTroopType,
      valueMappings,
      "troopType",
      normalizeImportTroop,
    ),
    tier: resolveMappedEnum(
      rawTier,
      valueMappings,
      "tier",
      normalizeImportTier,
    ),
    lairLevel: toNumber(getMappedValue(values, mapping, "lairLevel")),
    marchSize: toNumber(getMappedValue(values, mapping, "marchSize")),
    rallySize: toNumber(getMappedValue(values, mapping, "rallySize")),
    shift: resolveMappedEnum(
      rawShift,
      valueMappings,
      "shift",
      normalizeImportShift,
    ),
    captain: resolveMappedBoolean(
      getMappedValue(values, mapping, "captain"),
      valueMappings,
      "captain",
    ),
    readyAttack: resolveMappedBoolean(
      getMappedValue(values, mapping, "readyAttack"),
      valueMappings,
      "readyAttack",
    ),
    extraSquads: {
      fighter: parseExtraSquadTier(
        getMappedValue(values, mapping, "extraFighterTier"),
      ),
      rider: parseExtraSquadTier(
        getMappedValue(values, mapping, "extraRiderTier"),
      ),
      shooter: parseExtraSquadTier(
        getMappedValue(values, mapping, "extraShooterTier"),
      ),
    },
    comment: clean(getMappedValue(values, mapping, "comment")),
    customFields,
  };
}

export function getPlayerImportIssues(player) {
  const issues = [];

  if (!String(player?.nickname || "").trim()) issues.push("nickname");
  if (!String(player?.alliance || "").trim()) issues.push("alliance");
  if (!IMPORT_VALUE_OPTIONS.troopType.includes(player?.troopType)) {
    issues.push("troopType");
  }
  if (!IMPORT_VALUE_OPTIONS.tier.includes(player?.tier)) issues.push("tier");
  if (!IMPORT_VALUE_OPTIONS.shift.includes(player?.shift)) {
    issues.push("shift");
  }
  if (player?.captain === null) issues.push("captain");
  if (player?.readyAttack === null) issues.push("readyAttack");

  return issues;
}

function validatePlayer(player, rowNumber, existingNicknames, seenNicknames) {
  const issues = getPlayerImportIssues(player);
  const nicknameKey = makeImportNicknameKey(player.nickname);

  let duplicate = "";

  if (nicknameKey && existingNicknames.has(nicknameKey)) {
    duplicate = "existing";
  } else if (nicknameKey && seenNicknames.has(nicknameKey)) {
    duplicate = "file";
  }

  if (nicknameKey) seenNicknames.add(nicknameKey);

  return {
    rowNumber,
    valid: issues.length === 0 && !duplicate,
    issues,
    duplicate,
  };
}

export function buildPlayersImportPreview({
  fileData,
  mapping,
  customTargets = [],
  existingPlayers = [],
  valueMappings = {},
}) {
  const existingNicknames = new Set(
    existingPlayers
      .map((player) => clean(player.nickname).toLocaleLowerCase())
      .filter(Boolean),
  );
  const seenNicknames = new Set();

  const previewRows = fileData.rows.map((row) => {
    const player = rowToPlayer(row, mapping, customTargets, valueMappings);
    const validation = validatePlayer(
      player,
      row.rowNumber,
      existingNicknames,
      seenNicknames,
    );

    return {
      ...validation,
      player,
    };
  });

  return {
    fileName: fileData.fileName,
    headers: fileData.headers,
    rows: previewRows,
    total: previewRows.length,
    valid: previewRows.filter((row) => row.valid).length,
    invalid: previewRows.filter((row) => row.issues.length > 0).length,
    duplicates: previewRows.filter((row) => row.duplicate).length,
  };
}

export function getUnmappedHeaders(headers, mapping) {
  const mapped = new Set(Object.values(mapping || {}).filter(Boolean));
  return headers.filter((header) => !mapped.has(header));
}

export function makeImportCustomFieldId(label, usedIds = []) {
  const base =
    normalizedCompact(label)
      .replace(/[^a-z0-9а-яіїєґ]/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";

  let id = `import_${base}`;
  let suffix = 2;
  const used = new Set(usedIds);

  while (used.has(id)) {
    id = `import_${base}_${suffix}`;
    suffix += 1;
  }

  return id;
}
