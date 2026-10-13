const STATS = [
  {
    key: "registered",
    label: "registered",
    icon: "/images/admin/icons/actions/players.webp",
    className: "home-stat-card--players",
  },
  {
    key: "alliances",
    label: "allianceCount",
    icon: "/images/admin/region-editor/alliances.webp",
    className: "home-stat-card--alliances",
  },
  {
    key: "captains",
    label: "captains",
    icon: "/images/admin/region-editor/captain.webp",
    className: "home-stat-card--captains",
  },
  {
    key: "finalPlayers",
    label: "finalPlanPlayers",
    icon: "/images/admin/icons/final-plan.webp",
    className: "home-stat-card--final",
  },
];

function StatsSection({ t, dashboardStats }) {
  return (
    <section className="home-stats">
      {STATS.map(({ key, label, icon, className }) => (
        <article className={`home-stat-card ${className}`} key={key}>
          <img className="home-stat-card__image" src={icon} alt="" aria-hidden="true" />
          <div className="home-stat-card__content">
            <strong>{dashboardStats[key]}</strong>
            <span>{t.home.dashboard[label]}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

export default StatsSection;
