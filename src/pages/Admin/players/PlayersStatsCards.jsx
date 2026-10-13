import { publicAsset } from "../../../utils/publicAsset.js";

import { useMemo } from "react";

import { getEnabledRegistrationShifts } from "../../../features/registration/registrationShifts.js";

import "../styles/players/PlayersStatsCards.css";

const TROOPS = [
  {
    key: "fighter",
    icon: publicAsset("/images/admin/troops/fighter.webp"),
  },
  {
    key: "rider",
    icon: publicAsset("/images/admin/troops/rider.webp"),
  },
  {
    key: "shooter",
    icon: publicAsset("/images/admin/troops/shooter.webp"),
  },
];

const CARD_BACKGROUNDS = {
  shift1: publicAsset("/images/admin/stats/shift-1.webp"),
  shift2: publicAsset("/images/admin/stats/shift-2.webp"),
  shift3: publicAsset("/images/admin/stats/shift-3.webp"),
  shift4: publicAsset("/images/admin/stats/shift-4.webp"),
  flexible: publicAsset("/images/admin/stats/flexible-shift.webp"),
  total: publicAsset("/images/admin/stats/total.webp"),
};

const STAT_ICONS = {
  players: publicAsset("/images/admin/icons/actions/players.webp"),
  captains: publicAsset("/images/admin/region-editor/captain.webp"),
};

function isAssignedToTurret(player) {
  return Boolean(
    player.turretId ||
    player.turret ||
    player.turretNumber ||
    player.assignedTurret ||
    player.planTurret,
  );
}

function getTroopCount(players, troopType) {
  return players.filter((player) => player.troopType === troopType).length;
}

function getCaptainCount(players) {
  return players.filter((player) => player.captain === true).length;
}

function buildCard(players, key, title, assignedPlayerIds = null) {
  const inTurrets = assignedPlayerIds instanceof Set
    ? players.filter((player) => assignedPlayerIds.has(String(player.id))).length
    : players.filter(isAssignedToTurret).length;

  return {
    key,
    title,
    players: players.length,
    captains: getCaptainCount(players),
    inTurrets,
    reserve: Math.max(0, players.length - inTurrets),

    troops: TROOPS.map((troop) => ({
      ...troop,
      count: getTroopCount(players, troop.key),
    })),
  };
}

function MainStat({ icon, value, label, variant }) {
  return (
    <div
      className={`players-shift-card__main-stat players-shift-card__main-stat--${variant}`}
      title={label}
    >
      <img src={icon} alt="" aria-hidden="true" />

      <strong>{value}</strong>
    </div>
  );
}

function StatsCard({ card, t }) {
  return (
    <article
      className={`players-shift-card players-shift-card--${card.key}`}
      style={{
        "--stats-card-image": `url("${CARD_BACKGROUNDS[card.key]}")`,
      }}
    >
      <div className="players-shift-card__background" />

      <div className="players-shift-card__content">
        <h3>{card.title}</h3>

        <div className="players-shift-card__main-stats">
          <MainStat
            icon={STAT_ICONS.players}
            value={card.players}
            label={t.stats.players}
            variant="players"
          />

          <MainStat
            icon={STAT_ICONS.captains}
            value={card.captains}
            label={t.stats.captains}
            variant="captains"
          />
        </div>

        <div className="players-shift-card__meta">
          <span>
            {t.stats.inTurrets} <strong>{card.inTurrets}</strong>
          </span>

          <span className="players-shift-card__separator" aria-hidden="true">
            •
          </span>

          <span>
            {t.stats.reserve} <strong>{card.reserve}</strong>
          </span>
        </div>

        <div className="players-shift-card__divider" />

        <div className="players-shift-card__troops">
          {card.troops.map((troop) => (
            <div
              key={troop.key}
              className="players-shift-troop"
              title={t.troops[troop.key]}
            >
              <img
                src={troop.icon}
                alt=""
                aria-hidden="true"
                className="players-shift-troop__icon"
              />

              <strong className="players-shift-troop__count">
                {troop.count}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function PlayersStatsCards({ t, players = [], availableShifts = {}, assignedPlayerIds = null }) {
  const enabledShifts = useMemo(
    () => getEnabledRegistrationShifts(availableShifts),
    [availableShifts],
  );

  const cards = useMemo(() => {
    const shiftCards = enabledShifts.map((shift) => {
      const shiftPlayers = players.filter((player) => player.shift === shift);

      return buildCard(shiftPlayers, shift, t.shifts[shift], assignedPlayerIds);
    });

    return [...shiftCards, buildCard(players, "total", t.stats.total, assignedPlayerIds)];
  }, [players, enabledShifts, t, assignedPlayerIds]);

  return (
    <section className="players-shift-stats">
      {cards.map((card) => (
        <StatsCard key={card.key} card={card} t={t} />
      ))}
    </section>
  );
}

export default PlayersStatsCards;
