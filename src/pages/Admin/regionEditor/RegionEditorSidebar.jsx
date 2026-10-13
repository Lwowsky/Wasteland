import { publicAsset } from "../../../utils/publicAsset.js";

import { Search, X } from "lucide-react";

import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";

function RegionEditorSidebar({
  t,
  players,
  selectedPlayerId,
  search,
  onSearchChange,
  onSelectPlayer,
  mobileOpen = false,
  onMobileClose,
}) {
  return (
    <aside
      className={`region-editor-sidebar ${
        mobileOpen ? "region-editor-sidebar--mobile-open" : ""
      }`}
    >
      <div className="region-editor-sidebar__header">
        <div>
          <h3>{t.sidebar.title}</h3>
          <p>{t.sidebar.description}</p>
        </div>

        <div className="region-editor-sidebar__header-actions">
          <span className="region-editor-sidebar__count">{players.length}</span>

          <button
            type="button"
            className="region-editor-sidebar__mobile-close"
            onClick={onMobileClose}
            aria-label={t.common.close}
            title={t.common.close}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <label className="region-editor-search">
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t.sidebar.search}
        />
      </label>

      <div className="region-editor-player-list">
        {players.length === 0 ? (
          <div className="region-editor-empty">{t.sidebar.empty}</div>
        ) : (
          players.map((player) => {
            const active = String(selectedPlayerId) === String(player.id);

            return (
              <button
                key={player.id}
                type="button"
                className={`region-editor-player ${
                  active ? "region-editor-player--active" : ""
                }`}
                onClick={() => onSelectPlayer(player.id)}
              >
                <div className="region-editor-player__avatar">
                  <img
                    src={publicAsset("/images/admin/region-editor/player.webp")}
                    alt=""
                    aria-hidden="true"
                    className="region-editor-player__avatar-image"
                  />
                </div>

                <div className="region-editor-player__text">
                  <strong>{player.nickname || "—"}</strong>
                  <span>{player.alliance || "—"}</span>
                </div>

                <div className="region-editor-player__tier">
                  <TierBadge tier={player.tier || "T1"} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default RegionEditorSidebar;
