import { useEffect, useMemo, useState } from "react";

import {
  importAdminRegistrations,
} from "../services/adminPlayersApi.js";
import {
  buildPlayersImportPreview,
  getPlayerImportIssues,
} from "../utils/importPlayers.js";
import {
  PLAYER_IMPORT_DRAFT_EVENT,
  clearPlayerImportDraft,
  loadPlayerImportDraft,
  savePlayerImportDraft,
} from "../utils/localPlayerImportDraft.js";

function nicknameKey(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function buildDraftRows(draft, registrationSettings, existingPlayers) {
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

export default function useLocalPlayerImport({
  players,
  registrationSettings,
  currentPeriod,
  canTransferLocal,
  onReloadPlayers,
  labels,
  cancelLabel,
  onRequestConfirm,
}) {
  const [viewMode, setViewMode] = useState("d1");
  const [localDraft, setLocalDraft] = useState(() => loadPlayerImportDraft());
  const [selectedLocalIds, setSelectedLocalIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transferDialog, setTransferDialog] = useState(null);

  const resolvedViewMode = localDraft ? viewMode : "d1";

  useEffect(() => {
    function refreshLocalDraft() {
      setLocalDraft(loadPlayerImportDraft());
      setSelectedLocalIds(new Set());
    }

    window.addEventListener(PLAYER_IMPORT_DRAFT_EVENT, refreshLocalDraft);
    return () =>
      window.removeEventListener(PLAYER_IMPORT_DRAFT_EVENT, refreshLocalDraft);
  }, []);

  useEffect(() => {
    if (!localDraft || !currentPeriod?.id) {
      return;
    }

    const currentId = String(currentPeriod.id);
    const draftId = localDraft.targetPeriodId
      ? String(localDraft.targetPeriodId)
      : "";

    if (!draftId) {
      savePlayerImportDraft({
        ...localDraft,
        targetPeriodId: currentPeriod.id,
        targetCycleKey: currentPeriod.cycleKey ?? null,
      });
      return;
    }

    if (draftId !== currentId) {
      clearPlayerImportDraft();
    }
  }, [currentPeriod?.cycleKey, currentPeriod?.id, localDraft]);

  const baseRows = useMemo(
    () => buildDraftRows(localDraft, registrationSettings, players),
    [localDraft, registrationSettings, players],
  );

  const rows = useMemo(() => {
    const existingNames = new Set(
      players.map((player) => nicknameKey(player.nickname)).filter(Boolean),
    );
    const localSeen = new Set();

    return baseRows.map((row) => {
      const player = row.player || {};
      const key = nicknameKey(player.nickname);
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
  }, [baseRows, players]);

  const localPlayers = useMemo(() => rows.map((row) => row.player), [rows]);
  const readyRows = useMemo(() => rows.filter((row) => row.ready), [rows]);
  const importedCount = useMemo(
    () => rows.filter((row) => row.imported).length,
    [rows],
  );
  const problemCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          !row.imported &&
          (row.issues.length > 0 || row.duplicate === "local"),
      ).length,
    [rows],
  );
  const selectedReadyRows = useMemo(
    () => rows.filter((row) => row.ready && selectedLocalIds.has(row.localId)),
    [rows, selectedLocalIds],
  );

  function changeViewMode(nextMode) {
    setViewMode(nextMode);
    setMessage("");
    setError("");
  }

  function persistRows(nextRows) {
    if (!localDraft) {
      return;
    }

    const nextDraft = {
      ...localDraft,
      stagedRows: nextRows,
      savedAt: new Date().toISOString(),
      summary: {
        ...(localDraft.summary || {}),
        total: nextRows.length,
      },
    };

    savePlayerImportDraft(nextDraft);
    setLocalDraft(nextDraft);
  }

  async function updatePlayer(playerId, values) {
    persistRows(
      baseRows.map((row) =>
        row.localId === playerId
          ? { ...row, player: { ...row.player, ...values }, imported: false }
          : row,
      ),
    );
  }

  async function deletePlayer(player) {
    persistRows(baseRows.filter((row) => row.localId !== player.__localId));
    setSelectedLocalIds((current) => {
      const next = new Set(current);
      next.delete(player.__localId);
      return next;
    });
  }

  function toggleSelection(player) {
    if (!player.__localReady) {
      return;
    }

    setSelectedLocalIds((current) => {
      const next = new Set(current);

      if (next.has(player.__localId)) {
        next.delete(player.__localId);
      } else {
        next.add(player.__localId);
      }

      return next;
    });
  }

  function toggleAllVisible(visiblePlayers) {
    const selectableIds = visiblePlayers
      .filter((player) => player.__localReady)
      .map((player) => player.__localId);

    setSelectedLocalIds((current) => {
      const allSelected =
        selectableIds.length > 0 && selectableIds.every((id) => current.has(id));
      const next = new Set(current);

      selectableIds.forEach((id) => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });

      return next;
    });
  }

  function openTransferDialog(targetRows, scope) {
    if (!canTransferLocal || !targetRows.length || busy) {
      return;
    }

    setError("");
    setMessage("");
    setTransferDialog({ rows: targetRows, scope });
  }

  async function confirmTransfer(mode) {
    const targetRows = transferDialog?.rows || [];

    if (!canTransferLocal || !targetRows.length || busy) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await importAdminRegistrations(
        targetRows.map((row) => row.player),
        mode,
      );

      const importedIds = new Set(
        mode === "replacePeriod" || mode === "replacePeriodAndClose"
          ? readyRows.map((row) => row.localId)
          : targetRows
              .filter((row) => row.duplicate !== "existing")
              .map((row) => row.localId),
      );

      persistRows(
        baseRows.map((row) =>
          importedIds.has(row.localId) ? { ...row, imported: true } : row,
        ),
      );
      setSelectedLocalIds(new Set());
      setTransferDialog(null);

      const importedCount = Number(response.imported || 0);
      const skippedCount = Number(response.skipped || 0);

      setMessage(
        response.registrationClosed
          ? labels.replaceAndCloseSuccess.replace(
              "{{count}}",
              String(importedCount),
            )
          : response.replaced
            ? labels.replaceSuccess.replace("{{count}}", String(importedCount))
            : labels.transferSuccess
                .replace("{{count}}", String(importedCount))
                .replace("{{skipped}}", String(skippedCount)),
      );

      await onReloadPlayers?.();
    } catch (nextError) {
      console.error("Transfer local import players:", nextError);
      setError(
        labels.transferError.replace(
          "{{code}}",
          String(nextError?.message || "IMPORT_FAILED"),
        ),
      );
      await onReloadPlayers?.();
    } finally {
      setBusy(false);
    }
  }

  function clearImported() {
    persistRows(baseRows.filter((row) => !row.imported));
    setSelectedLocalIds(new Set());
  }

  function clearAll() {
    onRequestConfirm?.({
      title: labels.clearTitle,
      message: labels.clearConfirm,
      confirmLabel: labels.clearAll,
      cancelLabel,
      tone: "danger",
      onConfirm: async () => {
        clearPlayerImportDraft();
        setLocalDraft(null);
        setSelectedLocalIds(new Set());
        changeViewMode("d1");
      },
    });
  }

  function getRowStatus(player) {
    if (player.__localImported) {
      return { label: labels.imported, variant: "imported" };
    }

    if (player.__localDuplicate === "existing") {
      return { label: labels.duplicateD1, variant: "duplicate" };
    }

    if (player.__localDuplicate === "local") {
      return { label: labels.duplicateLocal, variant: "problem" };
    }

    if (player.__localIssues?.length) {
      return {
        label: player.__localIssues
          .map((issue) => labels.issueLabels[issue] || issue)
          .join(", "),
        variant: "problem",
      };
    }

    return { label: labels.ready, variant: "ready" };
  }

  return {
    viewMode: resolvedViewMode,
    draft: localDraft,
    draftCount: baseRows.length,
    players: localPlayers,
    rows,
    readyRows,
    selectedReadyRows,
    importedCount,
    problemCount,
    selectedIds: selectedLocalIds,
    busy,
    message,
    error,
    transferDialog,
    changeViewMode,
    updatePlayer,
    deletePlayer,
    toggleSelection,
    toggleAllVisible,
    openTransferDialog,
    confirmTransfer,
    clearImported,
    clearAll,
    getRowStatus,
    closeTransferDialog: () => !busy && setTransferDialog(null),
  };
}
