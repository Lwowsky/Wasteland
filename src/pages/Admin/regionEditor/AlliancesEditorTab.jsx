import { useMemo } from "react";

import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";

import { getEnabledRegistrationShifts } from "../../../features/registration/registrationShifts.js";

import { getAllianceStats } from "./regionEditorUtils.js";

import "../styles/regionEditor/AllianceCards.css";

const TROOP_ICONS = {
  fighter: "/images/admin/troops/fighter.webp",

  shooter: "/images/admin/troops/shooter.webp",

  rider: "/images/admin/troops/rider.webp",
};

function ShiftStat({ label, value, variant }) {
  return (
    <div
      className={`region-alliance-stat region-alliance-stat--${variant}`}
      title={label}
    >
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function TroopStat({ type, label, value }) {
  return (
    <div
      className={`region-alliance-troop region-alliance-troop--${type}`}
      title={label}
    >
      <img src={TROOP_ICONS[type]} alt="" aria-hidden="true" />

      <strong>{value}</strong>
    </div>
  );
}

function CompactHeaderStat({ type, label, value }) {
  const icon =
    type === "captains"
      ? "/images/admin/region-editor/captain.webp"
      : "/images/admin/region-editor/players.webp";

  return (
    <div
      className={`region-alliance-card__compact-stat region-alliance-card__compact-stat--${type}`}
      title={label}
    >
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="region-alliance-card__stat-image"
      />

      <strong>{value}</strong>
    </div>
  );
}

function AlliancesEditorTab({ t, shared, players, availableShifts = {} }) {
  const alliances = getAllianceStats(players);

  const enabledShifts = useMemo(
    () => getEnabledRegistrationShifts(availableShifts),
    [availableShifts],
  );

  if (alliances.length === 0) {
    return (
      <div className="region-editor-empty region-editor-empty--large">
        {t.alliances.empty}
      </div>
    );
  }

  return (
    <div className="region-alliance-grid">
      {alliances.map((alliance) => (
        <article key={alliance.name} className="region-alliance-card">
          <header className="region-alliance-card__header">
            <div className="region-alliance-card__identity">
              <div className="region-alliance-card__main-icon">
                <img
                  src="/images/admin/region-editor/alliances.webp"
                  alt=""
                  aria-hidden="true"
                  className="region-alliance-card__main-image"
                />
              </div>

              <div className="region-alliance-card__identity-text">
                <span>{t.alliances.alliance}</span>

                <h3>{alliance.name}</h3>
              </div>
            </div>

            <CompactHeaderStat
              type="players"
              label={t.alliances.registered}
              value={alliance.players}
            />

            <CompactHeaderStat
              type="captains"
              label={t.alliances.captains}
              value={alliance.captains}
            />
          </header>

          <div className="region-alliance-card__breakdown">
            {enabledShifts.length > 0 && (
              <div className="region-alliance-card__shift-row">
                {enabledShifts.map((shift) => (
                  <ShiftStat
                    key={shift}
                    label={shared.shifts[shift]}
                    value={alliance.shifts[shift] || 0}
                    variant={shift}
                  />
                ))}
              </div>
            )}

            <div className="region-alliance-card__troop-row">
              <TroopStat
                type="fighter"
                label={shared.troops.fighter}
                value={alliance.troops.fighter}
              />

              <TroopStat
                type="shooter"
                label={shared.troops.shooter}
                value={alliance.troops.shooter}
              />

              <TroopStat
                type="rider"
                label={shared.troops.rider}
                value={alliance.troops.rider}
              />
            </div>
          </div>

          {alliance.tiers.length > 0 && (
            <div className="region-alliance-card__tiers">
              <div className="region-alliance-card__tiers-heading">
                <img
                  src="/images/admin/region-editor/tier.webp"
                  alt=""
                  aria-hidden="true"
                  className="region-alliance-card__tiers-icon"
                />

                <span className="region-alliance-card__tiers-title">
                  {t.alliances.tiers}
                </span>
              </div>

              <div className="region-alliance-card__tier-list">
                {alliance.tiers.map((tier) => (
                  <div key={tier.tier} className="region-alliance-tier-item">
                    <TierBadge tier={tier.tier} />

                    <span>×</span>

                    <strong>{tier.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export default AlliancesEditorTab;
