import { Link } from "react-router-dom";
import { ROUTES, getRoute } from "../../../config/routes.js";

function NavigationSection({ t, language }) {
  const navigationCards = [
    {
      title: t.home.dashboard.navigation.registration.title,
      text: t.home.dashboard.navigation.registration.text,
      icon: "/images/registration-settings/registration-fields-icon.webp",
      route: ROUTES.registration,
      className: "home-nav-card--registration",
    },
    {
      title: t.home.dashboard.navigation.players.title,
      text: t.home.dashboard.navigation.players.text,
      icon: "/images/admin/icons/actions/players.webp",
      route: ROUTES.players,
      className: "home-nav-card--players",
    },
    {
      title: t.home.dashboard.navigation.finalPlan.title,
      text: t.home.dashboard.navigation.finalPlan.text,
      icon: "/images/admin/icons/final-plan.webp",
      route: ROUTES.finalPlan,
      className: "home-nav-card--plan",
    },
    {
      title: t.home.dashboard.navigation.settings.title,
      text: t.home.dashboard.navigation.settings.text,
      icon: "/images/admin/icons/settings.webp",
      route: ROUTES.settings,
      className: "home-nav-card--settings",
    },
  ];

  return (
    <section className="home-navigation">
      {navigationCards.map(({ title, text, icon, route, className }) => (
        <Link
          key={route}
          to={getRoute(language, route)}
          className={`home-nav-card ${className}`}
        >
          <div className="home-nav-card__icon">
            <img src={icon} alt="" aria-hidden="true" />
          </div>
          <div className="home-nav-card__content">
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <span className="home-nav-card__arrow" aria-hidden="true">→</span>
        </Link>
      ))}
    </section>
  );
}

export default NavigationSection;
