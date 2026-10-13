const STAT_CARDS = [
  {
    key: "total",
    group: "general",
    image: "/images/players/players-overview.webp",
    position: "25% center",
  },
  {
    key: "captains",
    group: "general",
    image: "/images/players/players-captain.webp",
    position: "30% center",
  },
  {
    key: "fighters",
    group: "troops",
    image: "/images/players/players-fighter.webp",
    position: "48% center",
  },
  {
    key: "riders",
    group: "troops",
    image: "/images/players/players-rider.webp",
    position: "56% center",
  },
  {
    key: "shooters",
    group: "troops",
    image: "/images/players/players-shooter.webp",
    position: "8% center",
  },
  {
    key: "shift1",
    group: "shifts",
    image: "/images/players/players-shift-1.webp",
    position: "68% center",
  },
  {
    key: "shift2",
    group: "shifts",
    image: "/images/players/players-shift-2.webp",
    position: "65% center",
  },
  {
    key: "shift3",
    group: "shifts",
    image: "/images/players/players-shift-3.webp",
    position: "65% center",
  },
  {
    key: "shift4",
    group: "shifts",
    image: "/images/players/players-shift-4.webp",
    position: "65% center",
  },
  {
    key: "flexible",
    group: "shifts",
    image: "/images/players/players-shift-flexible.webp",
    position: "55% center",
  },
];

const GENERAL_CARDS = STAT_CARDS.filter((card) => card.group === "general");
const TROOP_CARDS = STAT_CARDS.filter((card) => card.group === "troops");
const SHIFT_CARDS = STAT_CARDS.filter((card) => card.group === "shifts");

function getStatLabel(key, t) {
  if (key === "total") return t.players.stats.total;
  if (key === "captains") return t.players.stats.captains;
  if (key === "fighters") return t.players.troops.fighter;
  if (key === "riders") return t.players.troops.rider;
  if (key === "shooters") return t.players.troops.shooter;
  return t.players.shifts[key];
}

function StatCard({ card, stats, t }) {
  return (
    <article
      className="players-stat-card"
      style={{
        backgroundImage: `url("${card.image}")`,
        backgroundPosition: card.position,
      }}
    >
      <div className="players-stat-card__overlay" />

      <div className="players-stat-card__content">
        <span>{getStatLabel(card.key, t)}</span>
        <strong>{stats[card.key]}</strong>
      </div>
    </article>
  );
}

function CardGroup({ cards, columns, stats, t }) {
  return (
    <section className="players-stats-group">
      <div
        className={`players-stats-group__cards players-stats-group__cards--${columns}`}
      >
        {cards.map((card) => (
          <StatCard key={card.key} card={card} stats={stats} t={t} />
        ))}
      </div>
    </section>
  );
}

function PlayersStats({ stats, enabledShifts, t }) {
  const shiftCards = SHIFT_CARDS.filter((card) =>
    enabledShifts.includes(card.key),
  );

  return (
    <div className="players-stats-groups">
      <CardGroup cards={GENERAL_CARDS} columns="two" stats={stats} t={t} />
      <CardGroup cards={TROOP_CARDS} columns="three" stats={stats} t={t} />

      {shiftCards.length > 0 && (
        <CardGroup cards={shiftCards} columns="three" stats={stats} t={t} />
      )}
    </div>
  );
}

export default PlayersStats;
