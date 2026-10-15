import { publicAsset } from "../../../utils/publicAsset.js";

export default function PlayersAdminHeader({ pt, activePlayersCount, viewMode, canEdit,
  canManageDatabase, databaseBusy, databasePlayerCount,
  onOpenRegionEditor, onCreatePlayer, onClearDatabase }) {
  return (
    <header className="admin-players-header">
      <div className="admin-players-header__title">
        <div className="admin-players-header__icon">
          <img
            src={publicAsset("/images/admin/icons/actions/players.webp")}
            alt=""
            aria-hidden="true"
            className="admin-players-header__icon-image"
          />
        </div>

        <div>
          <h2>
            {pt.title}
            <span>({activePlayersCount})</span>
          </h2>
          <p>{pt.description}</p>
        </div>
      </div>

      {viewMode === "d1" && (
        <div className="admin-players-header__actions">
          <button
            type="button"
            className="admin-players-region-editor"
            onClick={() => onOpenRegionEditor()}
          >
            <span className="admin-players-region-editor__icon">
              <img
                src={publicAsset("/images/admin/icons/actions/region-editor.webp")}
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
              onClick={onCreatePlayer}
            >
              <img
                src={publicAsset("/images/admin/icons/actions/add-player.webp")}
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
              onClick={onClearDatabase}
              disabled={databaseBusy || databasePlayerCount === 0}
            >
              <img src={publicAsset("/images/admin/icons/actions/delete.webp")} alt="" aria-hidden="true" className="admin-players-button-icon" />
              {pt.databaseTable.clear}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
