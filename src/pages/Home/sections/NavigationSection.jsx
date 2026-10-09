import { ClipboardList, Map, Settings, Users } from "lucide-react";

import { Link } from "react-router-dom";

import { ROUTES, getRoute } from "../../../config/routes.js";

function NavigationSection({ t, language }) {
  const navigationCards = [
    {
      title: t.home.dashboard.navigation.registration.title,

      text: t.home.dashboard.navigation.registration.text,

      icon: ClipboardList,

      route: ROUTES.registration,

      className: "home-nav-card--registration",
    },

    {
      title: t.home.dashboard.navigation.players.title,

      text: t.home.dashboard.navigation.players.text,

      icon: Users,

      route: ROUTES.players,

      className: "home-nav-card--players",
    },

    {
      title: t.home.dashboard.navigation.finalPlan.title,

      text: t.home.dashboard.navigation.finalPlan.text,

      icon: Map,

      route: ROUTES.finalPlan,

      className: "home-nav-card--plan",
    },

    {
      title: t.home.dashboard.navigation.settings.title,

      text: t.home.dashboard.navigation.settings.text,

      icon: Settings,

      route: ROUTES.settings,

      className: "home-nav-card--settings",
    },
  ];

  return (
    <section className="home-navigation">
      {navigationCards.map(({ title, text, icon: Icon, route, className }) => (
        <Link
          key={route}
          to={getRoute(language, route)}
          className={`home-nav-card ${className}`}
        >
          <div className="home-nav-card__icon">
            <Icon size={30} />
          </div>

          <div className="home-nav-card__content">
            <h2>{title}</h2>

            <p>{text}</p>
          </div>

          <span className="home-nav-card__arrow">→</span>
        </Link>
      ))}
    </section>
  );
}

export default NavigationSection;
