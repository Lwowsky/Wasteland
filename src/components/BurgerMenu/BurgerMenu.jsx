import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  Home,
  ClipboardList,
  Users,
  Map,
  Settings,
  ChevronRight,
  X,
} from "lucide-react";

import { LANGUAGES, SUPPORTED_LANGUAGES } from "../../config/site.js";

import { ROUTES, getRoute } from "../../config/routes.js";

import { getLanguagePath } from "../../utils/language.js";

import "./BurgerMenu.css";

function BurgerMenu({
  t,
  language,
  event,
  brandText,
  canAccessAdmin = false,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  function toggleMenu() {
    setIsOpen((current) => !current);
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function changeLanguage(newLanguage) {
    navigate(getLanguagePath(location.pathname, newLanguage));

    closeMenu();
  }

  const menuItems = [
    {
      key: "home",
      label: t.header.home,
      icon: Home,
      route: ROUTES.home,
      end: true,
    },
    {
      key: "registration",
      label: t.header.registration,
      icon: ClipboardList,
      route: ROUTES.registration,
    },
    {
      key: "players",
      label: t.home.dashboard.navigation.players.title,
      icon: Users,
      route: ROUTES.players,
    },
    {
      key: "finalPlan",
      label: t.home.dashboard.navigation.finalPlan.title,
      icon: Map,
      route: ROUTES.finalPlan,
    },
    {
      key: "settings",
      label: t.home.dashboard.navigation.settings.title,
      icon: Settings,
      route: ROUTES.settings,
    },
  ];

  return (
    <div className="burger-menu">
      <button
        type="button"
        className="burger-menu__button"
        onClick={toggleMenu}
        aria-label={t.header.openNavigation}
        aria-expanded={isOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="burger-menu__overlay"
            onClick={closeMenu}
            aria-label={t.header.closeNavigation}
          />

          <aside className="burger-menu__panel">
            <div className="burger-menu__header">
              <div>
                <strong className="burger-menu__brand">{brandText || t.header.brand}</strong>

                {event && (
                  <p className="burger-menu__region">
                    {t.header.region} {event.region}
                    <span>{event.regionName}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                className="burger-menu__close"
                onClick={closeMenu}
                aria-label={t.header.closeNavigation}
              >
                <X size={26} />
              </button>
            </div>

            <div className="burger-menu__divider" />

            <nav className="burger-menu__nav">
              {menuItems.map(({ key, label, icon: Icon, route, end }) => (
                <NavLink
                  key={key}
                  to={getRoute(language, route)}
                  end={end}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    isActive
                      ? "burger-menu__link burger-menu__link--active"
                      : "burger-menu__link"
                  }
                >
                  <span className="burger-menu__icon">
                    <Icon size={22} />
                  </span>

                  <span className="burger-menu__label">{label}</span>

                  <ChevronRight className="burger-menu__arrow" size={20} />
                </NavLink>
              ))}

              {canAccessAdmin && (
                <>
                  <div className="burger-menu__divider" />

                  <NavLink
                    to={getRoute(language, ROUTES.admin)}
                    onClick={closeMenu}
                    className="burger-menu__link burger-menu__admin"
                  >
                    <span className="burger-menu__icon">
                      <Settings size={22} />
                    </span>

                    <span className="burger-menu__label">{t.header.admin}</span>

                    <ChevronRight className="burger-menu__arrow" size={20} />
                  </NavLink>
                </>
              )}
            </nav>

            <div className="burger-menu__languages">
              <span className="burger-menu__languages-title">
                {t.header.language}
              </span>

              <div className="burger-menu__language-buttons">
                {SUPPORTED_LANGUAGES.map((languageCode) => (
                  <button
                    key={languageCode}
                    type="button"
                    className={
                      language === languageCode
                        ? "burger-menu__language burger-menu__language--active"
                        : "burger-menu__language"
                    }
                    onClick={() => changeLanguage(languageCode)}
                  >
                    {LANGUAGES[languageCode].label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default BurgerMenu;
