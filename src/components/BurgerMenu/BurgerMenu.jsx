import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  Globe2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

import { LANGUAGES, SUPPORTED_LANGUAGES } from "../../config/site.js";
import { ROUTES, getRoute } from "../../config/routes.js";

const AdminMenuLink = lazy(() => import("./AdminMenuLink.jsx"));
import { publicAsset } from "../../utils/publicAsset.js";
import { getLanguagePath, savePreferredLanguage } from "../../utils/language.js";

import "./BurgerMenu.css";

function BurgerMenu({
  t,
  language,
  event,
  brandText,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    panelRef.current?.querySelector(".burger-menu__close")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Tab") {
        const items = [...(panelRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], summary, input:not([disabled])',
        ) || [])].filter((item) => item.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

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
    // Preserve URL queries and hashes (e.g. links carrying access context).
    navigate({
      pathname: getLanguagePath(location.pathname, newLanguage),
      search: location.search,
      hash: location.hash,
    });
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
        ref={menuButtonRef}
        type="button"
        className="burger-menu__button"
        onClick={toggleMenu}
        aria-label={t.header.openNavigation}
        aria-expanded={isOpen}
        aria-controls="wasteland-navigation-panel"
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

          <aside ref={panelRef} className="burger-menu__panel" id="wasteland-navigation-panel"
            role="dialog" aria-modal="true" aria-label={t.header.openNavigation}>
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

              <Suspense fallback={null}>
                <AdminMenuLink
                  t={t}
                  language={language}
                  onClose={closeMenu}
                />
              </Suspense>
            </nav>

            <section className="burger-menu__languages" aria-label={t.header.language}>
              <div className="burger-menu__languages-head">
                <span className="burger-menu__languages-title">
                  <Globe2 size={17} aria-hidden="true" />
                  {t.header.language}
                </span>
                <span className="burger-menu__languages-note">
                  {SUPPORTED_LANGUAGES.length} {t.header.languagesAvailable}
                </span>
              </div>

              <details className="burger-menu__language-picker">
                <summary className="burger-menu__language-current">
                  <img
                    src={publicAsset(`/images/final-plan/lang/${language}.svg`)}
                    width="27" height="27" alt="" aria-hidden="true"
                  />
                  <strong lang={language}>{LANGUAGES[language]?.nativeLabel || language}</strong>
                  <ChevronDown className="burger-menu__picker-chevron" size={18} aria-hidden="true" />
                </summary>

                <div className="burger-menu__language-list" role="group" aria-label={t.header.language}>
                  {SUPPORTED_LANGUAGES.map((languageCode) => {
                    const active = language === languageCode;
                    return (
                      <button key={languageCode} type="button"
                        className={`burger-menu__language${active ? " burger-menu__language--active" : ""}`}
                        aria-pressed={active}
                        onClick={() => changeLanguage(languageCode)}
                      >
                        <img className="burger-menu__language-flag"
                          src={publicAsset(`/images/final-plan/lang/${languageCode}.svg`)}
                          width="24" height="24" alt="" aria-hidden="true" />
                        <span className="burger-menu__language-copy" lang={languageCode}>
                          <strong>{LANGUAGES[languageCode]?.nativeLabel || languageCode}</strong>
                        </span>
                        {active ? <Check className="burger-menu__language-check" size={15}
                          aria-label={t.header.languageSelected} /> : null}
                      </button>
                    );
                  })}
                </div>
              </details>
            </section>
          </aside>
        </>
      )}
    </div>
  );
}

export default BurgerMenu;
