import {
  HEADER_ALIASES,
  IMPORT_VALUE_OPTIONS,
  NO_VALUES,
  PLAYER_IMPORT_FIELDS,
  SHIFT_ALIASES,
  TROOP_ALIASES,
  YES_VALUES,
} from "./importPlayersConfig.js";

export { IMPORT_VALUE_OPTIONS, PLAYER_IMPORT_FIELDS };

function clean(value) {
  return String(value ?? "").trim();
}

function normalizedKey(value) {
  return clean(value).toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizedCompact(value) {
  return normalizedKey(value).replace(/[\s_-]+/g, "");
}

export function makeImportValueKey(value) {
  return normalizedKey(value);
}

function matchHeader(header) {
  const key = normalizedKey(header);
  const compact = normalizedCompact(header);

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (
      aliases.some(
        (alias) =>
          normalizedKey(alias) === key || normalizedCompact(alias) === compact,
      )
    ) {
      return field;
    }
  }

  return null;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const parsed = Number(clean(value).replace(/[\s,]+/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function normalizeImportBoolean(value) {
  if (typeof value === "boolean") return value ? "true" : "false";

  const normalized = normalizedKey(value);
  if (YES_VALUES.has(normalized)) return "true";
  if (NO_VALUES.has(normalized)) return "false";
  return "";
}

function resolveMappedBoolean(rawValue, valueMappings, field) {
  if (rawValue === undefined) return false;

  const override = getValueOverride(valueMappings, field, rawValue);
  const resolved = override || normalizeImportBoolean(rawValue);

  if (resolved === "true") return true;
  if (resolved === "false") return false;
  return null;
}

function normalizeAliasedValue(value, aliases) {
  const key = normalizedKey(value);
  const direct = aliases.get(key);
  if (direct) return direct;

  const parts = key
    .split(/[/|;,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const matched = aliases.get(part);
    if (matched) return matched;
  }

  return key;
}

export function normalizeImportTroop(value) {
  return normalizeAliasedValue(value, TROOP_ALIASES);
}

export function normalizeImportShift(value) {
  return normalizeAliasedValue(value, SHIFT_ALIASES);
}

export function normalizeImportTier(value) {
  let raw = clean(value).toUpperCase().replace(/[\s_-]+/g, "");
  if (!raw) return "";

  raw = raw
    .replace(/^(?:ТІР|ТИР|TIER)/u, "T")
    .replace(/^Т/u, "T");

  const match = raw.match(/^T?(\d{1,2})$/);
  return match ? `T${Number(match[1])}` : raw;
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

export async function readPlayersImportFile(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) throw new Error("EMPTY_FILE");

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) throw new Error("EMPTY_FILE");

  const rawHeaders = (matrix[0] || []).map((value) => clean(value));
  const headers = rawHeaders.map(
    (header, index) => header || `Column ${index + 1}`,
  );
  const rows = matrix
    .slice(1)
    .filter((values) => values.some((value) => clean(value) !== ""))
    .map((values, rowIndex) => {
      const row = {};
      headers.forEach((header, columnIndex) => {
        row[header] = values[columnIndex] ?? "";
      });
      return { rowNumber: rowIndex + 2, values: row };
    });

  if (!rows.length) throw new Error("EMPTY_FILE");

  return {
    fileName: file.name,
    sheetName: firstSheetName,
    headers,
    rows,
    total: rows.length,
  };
}

export function getImportValueGroups({ fileData, mapping, valueMappings = {} }) {
  const fields = ["troopType", "tier", "shift", "captain", "readyAttack"];
  const normalizers = {
    troopType: normalizeImportTroop,
    tier: normalizeImportTier,
    shift: normalizeImportShift,
    captain: normalizeImportBoolean,
    readyAttack: normalizeImportBoolean,
  };

  return Object.fromEntries(
    fields.map((field) => {
      const header = mapping?.[field];
      if (!header) return [field, []];

      const seen = new Set();
      const values = [];

      for (const row of fileData.rows || []) {
        const raw = clean(row.values?.[header]);
        if (!raw) continue;
        const key = makeImportValueKey(raw);
        if (seen.has(key)) continue;
        seen.add(key);

        const automatic = normalizers[field](raw);
        const override = valueMappings?.[field]?.[key] || "";

        values.push({
          raw,
          key,
          automatic,
          resolved: override || automatic,
        });
      }

      return [field, values];
    }),
  );
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
  const nicknameKey = String(player.nickname || "").trim().toLocaleLowerCase();

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
