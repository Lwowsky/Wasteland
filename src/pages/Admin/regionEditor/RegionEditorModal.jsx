import { publicAsset } from "../../../utils/publicAsset.js";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";

import AlliancesEditorTab from "./AlliancesEditorTab.jsx";
import MarchRallyEditorTab from "./MarchRallyEditorTab.jsx";
import RegionEditorSidebar from "./RegionEditorSidebar.jsx";
import RegionEditorTabs from "./RegionEditorTabs.jsx";
import RegionOverviewTab from "./RegionOverviewTab.jsx";

import { filterRegionPlayers } from "./regionEditorUtils.js";

import "../styles/regionEditor/RegionEditor.css";

function RegionEditorModal({
  t,
  language,
  players,
  canEdit,
  saving,
  onUpdate,
  availableShifts = {},
  onClose,
}) {
  const r = t.regionEditor;

  const [activeTab, setActiveTab] = useState("players");
  const [search, setSearch] = useState("");
  const [mobilePlayersOpen, setMobilePlayersOpen] = useState(false);

  const [selectedPlayerId, setSelectedPlayerId] = useState(
    players[0]?.id || null,
  );

  const filteredPlayers = useMemo(
    () => filterRegionPlayers(players, search),
    [players, search],
  );

  const selectedPlayer =
    players.find((player) => String(player.id) === String(selectedPlayerId)) ||
    filteredPlayers[0] ||
    null;

  function handleSelectPlayer(playerId) {
    setSelectedPlayerId(playerId);
    setMobilePlayersOpen(false);
  }

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    setMobilePlayersOpen(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="1440px"
      closeLabel={r.common.close}
      title={r.title}
      subtitle={r.description}
      className="region-editor-modal"
    >
      <div className="region-editor-layout">
        <div
          className={`region-editor-mobile-backdrop ${
            mobilePlayersOpen ? "region-editor-mobile-backdrop--open" : ""
          }`}
          onClick={() => setMobilePlayersOpen(false)}
          aria-hidden="true"
        />

        <RegionEditorSidebar
          t={r}
          players={filteredPlayers}
          selectedPlayerId={selectedPlayer?.id}
          search={search}
          onSearchChange={setSearch}
          onSelectPlayer={handleSelectPlayer}
          mobileOpen={mobilePlayersOpen}
          onMobileClose={() => setMobilePlayersOpen(false)}
        />

        <main className="region-editor-main">
          <button
            type="button"
            className="region-editor-mobile-player-trigger"
            onClick={() => setMobilePlayersOpen(true)}
            aria-expanded={mobilePlayersOpen}
          >
            <img
              src={publicAsset("/images/admin/region-editor/player.webp")}
              alt=""
              aria-hidden="true"
            />

            <span className="region-editor-mobile-player-trigger__text">
              <small>{r.sidebar.title}</small>

              <strong>{selectedPlayer?.nickname || "—"}</strong>

              <em>{selectedPlayer?.alliance || "—"}</em>
            </span>

            <ChevronDown size={20} aria-hidden="true" />
          </button>

          <RegionEditorTabs
            t={r}
            activeTab={activeTab}
            onChange={handleTabChange}
          />

          <div className="region-editor-content">
            {activeTab === "players" && (
              <RegionOverviewTab
                t={r}
                shared={t}
                language={language}
                player={selectedPlayer}
              />
            )}

            {activeTab === "alliances" && (
              <AlliancesEditorTab
                t={r}
                shared={t}
                players={players}
                availableShifts={availableShifts}
              />
            )}

            {activeTab === "combat" && (
              <MarchRallyEditorTab
                t={r}
                players={players}
                canEdit={canEdit}
                saving={saving}
                onUpdate={onUpdate}
              />
            )}
          </div>
        </main>
      </div>
    </Modal>
  );
}

export default RegionEditorModal;
