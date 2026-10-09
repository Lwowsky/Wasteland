const TAB_ICONS = {
  players: "/images/admin/region-editor/players.webp",
  alliances: "/images/admin/region-editor/alliances.webp",
  combat: "/images/admin/region-editor/march.webp",
};

function RegionEditorTabs({ t, activeTab, onChange }) {
  const tabs = [
    {
      id: "players",
      label: t.tabs.players,
    },
    {
      id: "alliances",
      label: t.tabs.alliances,
    },
    {
      id: "combat",
      label: t.tabs.combat,
    },
  ];

  return (
    <div className="region-editor-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`region-editor-tab ${
            activeTab === tab.id ? "region-editor-tab--active" : ""
          }`}
          onClick={() => onChange(tab.id)}
        >
          <img
            src={TAB_ICONS[tab.id]}
            alt=""
            aria-hidden="true"
            className="region-editor-tab__image"
          />

          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default RegionEditorTabs;
