import { publicAsset } from "../../../utils/publicAsset.js";

function AccessNav({
  t,
  activeTab,
  onChange,
  usersCount = 0,
  pendingCount = 0,
  canViewRequests,
  canViewLimits = false,
}) {
  return (
    <nav className="admin-access-nav" aria-label={t.access.title}>
      <button
        type="button"
        className={`admin-access-nav__button admin-access-nav__button--users ${
          activeTab === "users" ? "admin-access-nav__button--active" : ""
        }`}
        onClick={() => onChange("users")}
        aria-pressed={activeTab === "users"}
      >
        <span className="admin-access-nav__icon">
          <img
            src={publicAsset("/images/admin/icons/roles-access.webp")}
            alt=""
            aria-hidden="true"
          />
        </span>

        <span className="admin-access-nav__label">{t.access.tabs.users}</span>

        <span className="admin-access-nav__count admin-access-nav__count--users">
          {usersCount}
        </span>
      </button>

      {canViewRequests && (
        <button
          type="button"
          className={`admin-access-nav__button admin-access-nav__button--requests ${
            activeTab === "requests" ? "admin-access-nav__button--active" : ""
          }`}
          onClick={() => onChange("requests")}
          aria-pressed={activeTab === "requests"}
        >
          <span className="admin-access-nav__icon">
            <img
              src={publicAsset("/images/admin/icons/access-requests.webp")}
              alt=""
              aria-hidden="true"
            />
          </span>

          <span className="admin-access-nav__label">
            {t.access.tabs.requests}
          </span>

          <span
            className={`admin-access-nav__count admin-access-nav__count--requests ${
              pendingCount > 0 ? "admin-access-nav__count--attention" : ""
            }`}
          >
            {pendingCount}
          </span>
        </button>
      )}
      {canViewLimits && (
        <button
          type="button"
          className={`admin-access-nav__button ${activeTab === "limits" ? "admin-access-nav__button--active" : ""}`}
          onClick={() => onChange("limits")}
          aria-pressed={activeTab === "limits"}
        >
          <span className="admin-access-nav__icon">
            <img src={publicAsset("/images/admin/icons/settings.webp")} alt="" aria-hidden="true" />
          </span>
          <span className="admin-access-nav__label">{t.access.tabs.limits}</span>
        </button>
      )}
    </nav>
  );
}

export default AccessNav;
