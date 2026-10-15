import { publicAsset } from "../../../utils/publicAsset.js";

import { useState } from "react";

import { getTimeAgo } from "../utils/time.js";
import useNow from "../../../hooks/useNow.js";

function OverviewSection({ t, dashboardStats, recentPlayers }) {
  const now = useNow(60_000);
  const allianceStats = dashboardStats.allianceStats || [];
  const [showAllAlliances, setShowAllAlliances] = useState(false);
  const visibleAlliances = showAllAlliances ? allianceStats : allianceStats.slice(0, 5);

  function getTroopLabel(troopType) {
    return t.players?.troops?.[troopType] || troopType;
  }

  return (
    <section className="home-middle-grid">
      <div className="home-alliance-panel">
        <div className="home-section-title">
          <img className="home-section-title__image" src={publicAsset("/images/admin/region-editor/alliances.webp")} alt="" aria-hidden="true" />

          <div>
            <h2>{t.home.dashboard.allianceStats.title}</h2>

            <p>{t.home.dashboard.allianceStats.text}</p>
          </div>
        </div>

        <div className={`home-alliance-list${showAllAlliances ? " is-expanded" : ""}`}>
          {visibleAlliances.map((alliance, index) => {
            const percent =
              dashboardStats.registered > 0
                ? Math.round(
                    (alliance.players / dashboardStats.registered) * 100,
                  )
                : 0;

            return (
              <div className="home-alliance-row" key={alliance.name}>
                <span className="home-alliance-position">{index + 1}</span>

                <strong>{alliance.name}</strong>

                <span>
                  {alliance.players} {t.home.dashboard.allianceStats.players}
                </span>

                <div className="home-alliance-progress">
                  <span
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </div>

                <b>{percent}%</b>
              </div>
            );
          })}
        </div>
        {allianceStats.length > 5 && (
          <button
            className="home-alliance-toggle"
            type="button"
            aria-expanded={showAllAlliances}
            onClick={() => setShowAllAlliances((current) => !current)}
          >
            {showAllAlliances
              ? t.home.dashboard.allianceStats.showLess
              : t.home.dashboard.allianceStats.showAll}
          </button>
        )}
      </div>

      <div className="home-recent-panel">
        <div className="home-section-title">
          <img className="home-section-title__image" src={publicAsset("/images/registration-settings/registration-fields-icon.webp")} alt="" aria-hidden="true" />

          <div>
            <h2>{t.home.dashboard.recent.title}</h2>

            <p>{t.home.dashboard.recent.text}</p>
          </div>
        </div>

        <div className="home-recent-table">
          <div className="home-recent-head">
            <span>{t.home.dashboard.recent.nickname}</span>

            <span>{t.home.dashboard.recent.alliance}</span>

            <span>{t.home.dashboard.recent.troop}</span>

            <span>{t.home.dashboard.recent.tier}</span>

            <span>{t.home.dashboard.recent.time}</span>
          </div>

          {recentPlayers.map((player) => (
            <div className="home-recent-row" key={player.id}>
              <strong>{player.nickname}</strong>

              <span className="home-recent-alliance">{player.alliance}</span>

              <span>{getTroopLabel(player.troopType)}</span>

              <strong className="home-recent-tier">{player.tier}</strong>

              <span className="home-recent-time">
                {getTimeAgo(player.createdAt, now, t.home.dashboard.recent.timeAgo)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OverviewSection;
