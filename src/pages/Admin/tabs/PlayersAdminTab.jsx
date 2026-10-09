import { AlertTriangle, Trash2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal.jsx";
import LocalPlayerImportPanel from "../players/LocalPlayerImportPanel.jsx";
import PlayersFilters from "../players/PlayersFilters.jsx";
import PlayersStatsCards from "../players/PlayersStatsCards.jsx";
import PlayersTable from "../players/PlayersTable.jsx";
import useLocalPlayerImport from "../players/useLocalPlayerImport.js";
import usePlayersAdminTable from "../players/usePlayersAdminTable.js";
import { clearAdminPlayerTable } from "../services/adminPlayersApi.js";

import "../styles/players/PlayersAdminTab.css";

const PlayerEditorModal = lazy(() => import("../players/PlayerEditorModal.jsx"));
const TransferLocalPlayersModal = lazy(() =>
  import("../players/TransferLocalPlayersModal.jsx"),
);
const RegionEditorModal = lazy(() =>
  import("../regionEditor/RegionEditorModal.jsx"),
);

function PlayersAdminTab({
  t,
  language,
  players,
  loading,
  error,
  canEdit,
  canDelete,
  saving,
  onCreate,
  onUpdate,
  onDelete,
  registrationSettings,
  canTransferLocal = false,
  onReloadPlayers,
  currentPeriod,
  canManageDatabase = false,
}) {
  const pt = t.players;
  const lt = pt.localImport;
  const availableShifts = registrationSettings?.availableShifts || {};

  const [editor, setEditor] = useState(null);
  const [regionEditorOpen, setRegionEditorOpen] = useState(false);
  const [databaseBusy, setDatabaseBusy] = useState(false);
  const [databaseMessage, setDatabaseMessage] = useState("");
  const [databaseError, setDatabaseError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const localImport = useLocalPlayerImport({
    players,
    registrationSettings,
    currentPeriod,
    canTransferLocal,
    onReloadPlayers,
    labels: lt,
    cancelLabel: pt.actions.cancel,
    onRequestConfirm: setConfirmDialog,
  });

  const activePlayers =
    localImport.viewMode === "local" ? localImport.players : players;
  const table = usePlayersAdminTable(activePlayers, registrationSettings);

  function changeViewMode(nextMode) {
    localImport.changeViewMode(nextMode);
    table.resetTable();
  }

  function openCreate() {
    setEditor({ mode: "create", source: "d1", player: null });
  }

  function openEdit(player) {
    setEditor({ mode: "edit", source: localImport.viewMode, player });
  }

  function closeEditor() {
    if (saving || localImport.busy) {
      return;
    }

    setEditor(null);
  }

  async function handleTableDelete(player) {
    setConfirmDialog({
      title: pt.confirm.deletePlayerTitle,
      message: pt.editor.confirmDelete.replace("{{name}}", player.nickname || ""),
      confirmLabel: pt.actions.delete,
      cancelLabel: pt.actions.cancel,
      tone: "danger",
      onConfirm: async () => {
        if (localImport.viewMode === "local") {
          await localImport.deletePlayer(player);
        } else {
          await onDelete(player);
        }
      },
    });
  }

  function clearDatabaseTable() {
    if (!canManageDatabase || databaseBusy) {
      return;
    }

    setConfirmDialog({
      title: pt.databaseTable.clearTitle,
      message: pt.databaseTable.clearConfirm,
      confirmLabel: pt.databaseTable.clear,
      cancelLabel: pt.actions.cancel,
      tone: "danger",
      countdownSeconds: 10,
      onConfirm: async () => {
        setDatabaseBusy(true);
        setDatabaseError("");
        setDatabaseMessage("");

        try {
          const response = await clearAdminPlayerTable();
          setDatabaseMessage(
            pt.databaseTable.clearSuccess.replace(
              "{{count}}",
              String(response.cleared || 0),
            ),
          );
          await onReloadPlayers?.();
        } catch (nextError) {
          setDatabaseError(
            pt.databaseTable.error.replace(
              "{{code}}",
              String(nextError?.message || "REQUEST_FAILED"),
            ),
          );
        } finally {
          setDatabaseBusy(false);
        }
      },
    });
  }

  return (
    <section className="admin-players">
      <header className="admin-players-header">
        <div className="admin-players-header__title">
          <div className="admin-players-header__icon">
            <img
              src="/images/admin/icons/actions/players.webp"
              alt=""
              aria-hidden="true"
              className="admin-players-header__icon-image"
            />
          </div>

          <div>
            <h2>
              {pt.title}
              <span>({activePlayers.length})</span>
            </h2>
            <p>{pt.description}</p>
          </div>
        </div>

        {localImport.viewMode === "d1" && (
          <div className="admin-players-header__actions">
            <button
              type="button"
              className="admin-players-region-editor"
              onClick={() => setRegionEditorOpen(true)}
            >
              <span className="admin-players-region-editor__icon">
                <img
                  src="/images/admin/icons/actions/region-editor.webp"
                  alt=""
                  aria-hidden="true"
                  className="admin-players-button-icon"
                />
              </span>
              <span>{pt.regionEditor.action}</span>
            </button>

            {canEdit && (
              <button
                type="button"
                className="admin-players-add"
                onClick={openCreate}
              >
                <img
                  src="/images/admin/icons/actions/add-player.webp"
                  alt=""
                  aria-hidden="true"
                  className="admin-players-button-icon"
                />
                {pt.actions.add}
              </button>
            )}

            {canManageDatabase && (
              <button
                type="button"
                className="admin-players-clear-database"
                onClick={clearDatabaseTable}
                disabled={databaseBusy || players.length === 0}
              >
                <Trash2 size={17} aria-hidden="true" />
                {pt.databaseTable.clear}
              </button>
            )}
          </div>
        )}
      </header>

      {databaseMessage && (
        <div className="admin-local-import__message is-success">
          {databaseMessage}
        </div>
      )}
      {databaseError && (
        <div className="admin-local-import__message is-error">
          {databaseError}
        </div>
      )}

      <LocalPlayerImportPanel
        labels={lt}
        databaseCount={players.length}
        viewMode={localImport.viewMode}
        draft={localImport.draft}
        draftCount={localImport.draftCount}
        readyCount={localImport.readyRows.length}
        problemCount={localImport.problemCount}
        importedCount={localImport.importedCount}
        selectedReadyCount={localImport.selectedReadyRows.length}
        canTransfer={canTransferLocal}
        busy={localImport.busy}
        message={localImport.message}
        error={localImport.error}
        onViewModeChange={changeViewMode}
        onTransferSelected={() =>
          localImport.openTransferDialog(localImport.selectedReadyRows, "selected")
        }
        onTransferAll={() =>
          localImport.openTransferDialog(localImport.readyRows, "all")
        }
        onClearImported={localImport.clearImported}
        onClearAll={localImport.clearAll}
      />

      <PlayersStatsCards
        t={pt}
        players={activePlayers}
        availableShifts={availableShifts}
      />

      {table.attentionCount > 0 && (
        <button
          type="button"
          className="admin-players-attention-summary"
          onClick={() =>
            table.setFilters((current) => ({
              ...current,
              ruleStatus: "attention",
            }))
          }
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            {pt.ruleStatus.attentionSummary.replace(
              "{{count}}",
              String(table.attentionCount),
            )}
          </span>
        </button>
      )}

      <PlayersFilters
        t={pt}
        players={activePlayers}
        filters={table.filters}
        setFilters={table.setFilters}
        onReset={table.resetTable}
        availableShifts={availableShifts}
        pageSize={table.pageSize}
        setPageSize={table.setPageSize}
      />

      <PlayersTable
        t={pt}
        language={language}
        players={table.filteredPlayers}
        loading={localImport.viewMode === "d1" ? loading : false}
        error={localImport.viewMode === "d1" ? error : ""}
        canEdit={localImport.viewMode === "local" ? true : canEdit}
        canDelete={localImport.viewMode === "local" ? true : canDelete}
        sort={table.sort}
        setSort={table.setSort}
        onEdit={openEdit}
        onDelete={handleTableDelete}
        registrationSettings={registrationSettings}
        selectable={localImport.viewMode === "local"}
        selectedIds={localImport.selectedIds}
        onToggleSelected={localImport.toggleSelection}
        onToggleSelectAll={localImport.toggleAllVisible}
        isRowSelectable={(player) => player.__localReady === true}
        getRowStatus={
          localImport.viewMode === "local" ? localImport.getRowStatus : null
        }
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
      />

      {editor && (
        <Suspense fallback={null}>
          <PlayerEditorModal
            key={`${editor.source}-${editor.player?.id || "new"}`}
            t={pt}
            mode={editor.mode}
            player={editor.player}
            saving={editor.source === "local" ? localImport.busy : saving}
            canDelete={editor.source === "local" ? true : canDelete}
            onClose={closeEditor}
            onCreate={onCreate}
            onUpdate={
              editor.source === "local" ? localImport.updatePlayer : onUpdate
            }
            onDelete={
              editor.source === "local" ? localImport.deletePlayer : onDelete
            }
            registrationSettings={registrationSettings}
          />
        </Suspense>
      )}

      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        closeLabel={confirmDialog?.cancelLabel}
        tone={confirmDialog?.tone}
        countdownSeconds={confirmDialog?.countdownSeconds || 0}
        busy={databaseBusy}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          await action?.();
        }}
      />

      {localImport.transferDialog && (
        <Suspense fallback={null}>
          <TransferLocalPlayersModal
            open
            onClose={localImport.closeTransferDialog}
            t={lt.transferModal}
            rows={localImport.transferDialog.rows}
            existingPlayers={players}
            allowReplaceAll={
              localImport.transferDialog.scope === "all" &&
              localImport.problemCount === 0 &&
              localImport.importedCount === 0 &&
              localImport.readyRows.length === localImport.draftCount &&
              localImport.transferDialog.rows.length ===
                localImport.readyRows.length
            }
            busy={localImport.busy}
            onConfirm={localImport.confirmTransfer}
          />
        </Suspense>
      )}

      {regionEditorOpen && (
        <Suspense fallback={null}>
          <RegionEditorModal
            t={pt}
            language={language}
            players={players}
            canEdit={canEdit}
            saving={saving}
            onUpdate={onUpdate}
            availableShifts={availableShifts}
            onClose={() => setRegionEditorOpen(false)}
          />
        </Suspense>
      )}
    </section>
  );
}

export default PlayersAdminTab;
