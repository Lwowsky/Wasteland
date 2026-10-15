import {
  clean,
  makeImportValueKey,
  normalizeImportBoolean,
  normalizeImportShift,
  normalizeImportTier,
  normalizeImportTroop,
} from "./importPlayersNormalization.js";

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

