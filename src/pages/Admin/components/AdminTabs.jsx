import { publicAsset } from "../../../utils/publicAsset.js";

const TAB_ICONS = {
  access: publicAsset("/images/admin/icons/roles-access.webp"),

  players: publicAsset("/images/admin/icons/actions/players.webp"),

  distribution: publicAsset("/images/admin/icons/turret-distribution.webp"),

  registration: publicAsset("/images/admin/icons/registration-settings.webp"),

  settings: publicAsset("/images/admin/icons/settings.webp"),
};

function AdminTabs({ tabs, activeTab, onChange, ariaLabel }) {
  return (
    <nav className="admin-main-tabs" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const imageIcon = TAB_ICONS[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            className={`admin-main-tab ${
              activeTab === tab.id ? "admin-main-tab--active" : ""
            }`}
            onClick={() => onChange(tab.id)}
          >
            <span className="admin-main-tab__icon">
              {imageIcon && <img src={imageIcon} alt="" aria-hidden="true" />}
            </span>

            <span className="admin-main-tab__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default AdminTabs;
