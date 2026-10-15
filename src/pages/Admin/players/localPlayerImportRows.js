import {
  buildPlayersImportPreview,
  getPlayerImportIssues,
} from "../utils/importPlayers.js";
import { makeImportNicknameKey } from "../utils/importPlayersNormalization.js";

export function buildDraftRows(draft, registrationSettings, existingPlayers) {
  if (!draft) {
    return [];
  }

  if (Array.isArray(draft.stagedRows)) {
    return draft.stagedRows;
  }

  if (!draft.fileData?.rows) {
    return [];
  }

  const customTargets = [
    ...(registrationSettings?.customFields || []).map((field) => ({
      ...field,
      configured: true,
      custom: true,
    })),
    ...(draft.manualFields || []),
  ];

  const preview = buildPlayersImportPreview({
    fileData: draft.fileData,
    mapping: draft.mapping || {},
    customTargets,
    existingPlayers,
    valueMappings: draft.valueMappings || {},
  });

  return preview.rows.map((row) => ({
    localId: `legacy-${row.rowNumber}`,
    rowNumber: row.rowNumber,
    player: row.player,
    imported: false,
  }));
}

export function annotateLocalImportRows(baseRows, players) {
  const existingNames = new Set(
    players.map((player) => makeImportNicknameKey(player.nickname)).filter(Boolean),
  );
  const localSeen = new Set();

  return baseRows.map((row) => {
    const player = row.player || {};
    const key = makeImportNicknameKey(player.nickname);
    const issues = getPlayerImportIssues(player);
    let duplicate = "";

    if (key && localSeen.has(key)) {
      duplicate = "local";
    } else if (key && existingNames.has(key)) {
      duplicate = "existing";
    }

    if (key) {
      localSeen.add(key);
    }

    const ready =
      row.imported !== true && issues.length === 0 && duplicate !== "local";

    return {
      ...row,
      issues,
      duplicate,
      ready,
      player: {
        ...player,
        id: row.localId,
        __localId: row.localId,
        __localImported: row.imported === true,
        __localReady: ready,
        __localDuplicate: duplicate,
        __localIssues: issues,
      },
    };
  });
}

export function toggleVisibleLocalSelection(selectedIds, visiblePlayers) {
  const selectableIds = visiblePlayers
    .filter((player) => player.__localReady)
    .map((player) => player.__localId);

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const next = new Set(selectedIds);

  selectableIds.forEach((id) => {
    if (allSelected) {
      next.delete(id);
    } else {
      next.add(id);
    }
  });

  return next;
}

export function getImportedLocalIds(mode, targetRows, readyRows) {
  return new Set(
    mode === "replacePeriod" || mode === "replacePeriodAndClose"
      ? readyRows.map((row) => row.localId)
      : targetRows
          .filter((row) => row.duplicate !== "existing")
          .map((row) => row.localId),
  );
}
