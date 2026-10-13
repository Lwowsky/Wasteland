import { PLAYER_IMPORT_FIELDS } from "../utils/importPlayers.js";

const REQUIRED_IMPORT_FIELDS = new Set([
  "nickname",
  "alliance",
  "troopType",
  "tier",
  "shift",
]);

export const IMPORT_VALUE_FIELDS = [
  "troopType",
  "tier",
  "shift",
  "captain",
  "readyAttack",
];

export function getImportTargets(t, customTargets) {
  return [
    ...PLAYER_IMPORT_FIELDS.map((id) => ({
      id,
      label: t.fields[id] || id,
      required: REQUIRED_IMPORT_FIELDS.has(id),
    })),
    ...customTargets,
  ];
}

export function getImportIssueText(row, t) {
  const parts = row.issues.map(
    (issue) => t.errors.invalidField[issue] || issue,
  );

  if (row.duplicate === "existing") {
    parts.push(t.errors.duplicateExisting);
  }

  if (row.duplicate === "file") {
    parts.push(t.errors.duplicateFile);
  }

  return parts.join(" · ");
}

export function getImportValueLabel(field, value, t) {
  if (field === "troopType") {
    return t.valueMapping.troops[value] || value;
  }

  if (field === "shift") {
    return t.valueMapping.shifts[value] || value;
  }

  if (field === "captain" || field === "readyAttack") {
    return value === "true" ? t.valueMapping.yes : t.valueMapping.no;
  }

  return value;
}
