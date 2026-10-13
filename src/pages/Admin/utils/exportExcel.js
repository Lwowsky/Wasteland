function formatBoolean(value, labels) {
  return value ? labels.yes : labels.no;
}

function formatExtraSquadTier(extraSquads, type) {
  const squad = extraSquads?.[type];
  return squad?.enabled ? squad.tier || "" : "";
}

export function getExportFieldDefinitions({ labels, registrationSettings, players }) {
  const builtIns = [
    { id: "nickname", label: labels.columns.nickname },
    { id: "alliance", label: labels.columns.alliance },
    { id: "troopType", label: labels.columns.troop },
    { id: "tier", label: labels.columns.tier },
    { id: "lairLevel", label: labels.columns.lair },
    { id: "marchSize", label: labels.columns.march },
    { id: "rallySize", label: labels.columns.rally },
    { id: "shift", label: labels.columns.shift },
    { id: "captain", label: labels.columns.captain },
    { id: "readyAttack", label: labels.columns.readyAttack },
    { id: "extraFighterTier", label: labels.columns.extraFighterTier },
    { id: "extraRiderTier", label: labels.columns.extraRiderTier },
    { id: "extraShooterTier", label: labels.columns.extraShooterTier },
    { id: "comment", label: labels.columns.comment },
    { id: "submittedAt", label: labels.columns.submitted },
  ];

  const configured = new Map(
    (registrationSettings?.customFields || []).map((field) => [
      field.id,
      { id: `custom:${field.id}`, customId: field.id, label: field.label, custom: true },
    ]),
  );

  for (const player of players || []) {
    for (const key of Object.keys(player.customFields || {})) {
      if (!configured.has(key)) {
        configured.set(key, {
          id: `custom:${key}`,
          customId: key,
          label: key,
          custom: true,
        });
      }
    }
  }

  return [...builtIns, ...configured.values()];
}

function playerRows(players, selectedFields, fields, labels) {
  const byId = new Map(fields.map((field) => [field.id, field]));

  return players.map((player) => {
    const row = {};

    for (const [fieldId, enabled] of Object.entries(selectedFields)) {
      if (!enabled) continue;
      const field = byId.get(fieldId);
      if (!field) continue;

      if (field.custom) {
        row[field.label] = player.customFields?.[field.customId] ?? "";
        continue;
      }

      switch (fieldId) {
        case "nickname":
          row[field.label] = player.nickname || "";
          break;
        case "alliance":
          row[field.label] = player.alliance || "";
          break;
        case "troopType":
          row[field.label] = labels.troops[player.troopType] || player.troopType || "";
          break;
        case "tier":
          row[field.label] = player.tier || "";
          break;
        case "lairLevel":
          row[field.label] = player.lairLevel ?? 0;
          break;
        case "marchSize":
          row[field.label] = player.marchSize ?? 0;
          break;
        case "rallySize":
          row[field.label] = player.rallySize ?? 0;
          break;
        case "shift":
          row[field.label] = labels.shifts[player.shift] || player.shift || "";
          break;
        case "captain":
          row[field.label] = formatBoolean(player.captain, labels);
          break;
        case "readyAttack":
          row[field.label] = formatBoolean(player.readyAttack, labels);
          break;
        case "extraFighterTier":
          row[field.label] = formatExtraSquadTier(player.extraSquads, "fighter");
          break;
        case "extraRiderTier":
          row[field.label] = formatExtraSquadTier(player.extraSquads, "rider");
          break;
        case "extraShooterTier":
          row[field.label] = formatExtraSquadTier(player.extraSquads, "shooter");
          break;
        case "comment":
          row[field.label] = player.comment || "";
          break;
        case "submittedAt":
          row[field.label] = player.submittedAt || player.createdAt || "";
          break;
        default:
          break;
      }
    }

    return row;
  });
}

export async function exportAdminWorkbook({
  fileName,
  players,
  selectedFields,
  fields,
  labels,
}) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(
    playerRows(players, selectedFields, fields, labels),
  );

  XLSX.utils.book_append_sheet(workbook, sheet, labels.sheets.players);
  XLSX.writeFile(workbook, `${fileName || "wasteland-players"}.xlsx`);
}
