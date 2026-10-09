import { Crown, Shield, Users } from "lucide-react";

function StatsSection({ t, dashboardStats }) {
  return (
    <section className="home-stats">
      <article className="home-stat-card">
        <div className="home-stat-card__icon">
          <Users size={26} />
        </div>

        <div className="home-stat-card__content">
          <strong>{dashboardStats.registered}</strong>

          <span>{t.home.dashboard.registered}</span>
        </div>
      </article>

      <article className="home-stat-card">
        <div className="home-stat-card__icon home-stat-card__icon--purple">
          <Shield size={26} />
        </div>

        <div>
          <strong>{dashboardStats.alliances}</strong>

          <span>{t.home.dashboard.allianceCount}</span>
        </div>
      </article>

      <article className="home-stat-card">
        <div className="home-stat-card__icon home-stat-card__icon--orange">
          <Crown size={26} />
        </div>

        <div>
          <strong>{dashboardStats.captains}</strong>

          <span>{t.home.dashboard.captains}</span>
        </div>
      </article>

      <article className="home-stat-card">
        <div className="home-stat-card__icon home-stat-card__icon--green">
          <Users size={26} />
        </div>

        <div>
          <strong>{dashboardStats.finalPlayers}</strong>

          <span>{t.home.dashboard.finalPlanPlayers}</span>
        </div>
      </article>
    </section>
  );
}

export default StatsSection;
