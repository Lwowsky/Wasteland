import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  Globe2,
  ChevronRight,
  X,
} from "lucide-react";

import { LANGUAGES, SUPPORTED_LANGUAGES } from "../../config/site.js";
import { ROUTES, getRoute } from "../../config/routes.js";
import { publicAsset } from "../../utils/publicAsset.js";
import { getLanguagePath, savePreferredLanguage } from "../../utils/language.js";

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
    savePreferredLanguage(newLanguage);
    navigate(getLanguagePath(location.pathname, newLanguage));
    closeMenu();
  }

  const menuItems = [
    {
      key: "home",
      label: t.header.home,
      iconSrc: "/images/navigation/home-icon.webp",
      route: ROUTES.home,
      end: true,
    },
    {
      key: "registration",
      label: t.header.registration,
      iconSrc: "/images/registration-settings/registration-fields-icon.webp",
      route: ROUTES.registration,
    },
    {
      key: "players",
      label: t.home.dashboard.navigation.players.title,
      iconSrc: "/images/admin/icons/actions/players.webp",
      route: ROUTES.players,
    },
    {
      key: "finalPlan",
      label: t.home.dashboard.navigation.finalPlan.title,
      iconSrc: "/images/admin/icons/final-plan.webp",
      route: ROUTES.finalPlan,
    },
    {
      key: "settings",
      label: t.home.dashboard.navigation.settings.title,
      iconSrc: "/images/admin/icons/settings.webp",
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
                <strong className="burger-menu__brand">
                  {brandText || t.header.brand}
                </strong>

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
              {menuItems.map(({ key, label, icon: Icon, iconSrc, route, end }) => (
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
                    {iconSrc ? (
                      <img src={publicAsset(iconSrc)} alt="" aria-hidden="true" />
                    ) : (
                      <Icon size={22} aria-hidden="true" />
                    )}
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
                      <img
                        src={publicAsset("/images/admin/icons/admin.webp")}
                        alt=""
                        aria-hidden="true"
                      />
                    </span>

                    <span className="burger-menu__label">{t.header.admin}</span>

                    <ChevronRight className="burger-menu__arrow" size={20} />
                  </NavLink>
                </>
              )}
            </nav>

            <div className="burger-menu__languages">
              <div className="burger-menu__languages-head">
                <span className="burger-menu__languages-title">
                  {t.header.language}
                </span>
                <span className="burger-menu__languages-note">
                  <Globe2 size={16} aria-hidden="true" />
                  {SUPPORTED_LANGUAGES.length}
                </span>
              </div>

              <div className="burger-menu__language-list" role="list">
                {SUPPORTED_LANGUAGES.map((languageCode) => {
                  const translatedLanguage =
                    t.header.languageOptions?.[languageCode] || {};
                  const languageMeta = {
                    badge:
                      translatedLanguage.badge ||
                      LANGUAGES[languageCode]?.badge ||
                      languageCode.toUpperCase(),
                    nativeLabel:
                      translatedLanguage.label || languageCode.toUpperCase(),
                    englishLabel:
                      translatedLanguage.description || languageCode.toUpperCase(),
                  };

                  return (
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
                      <span className="burger-menu__language-badge">
                        {languageMeta.badge || languageMeta.label}
                      </span>

                      <span className="burger-menu__language-copy">
                        <strong>{languageMeta.nativeLabel || languageMeta.label}</strong>
                        <small>{languageMeta.englishLabel || languageMeta.label}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default BurgerMenu;
