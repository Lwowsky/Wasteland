import Container from "../Container/Container.jsx";
import BurgerMenu from "../BurgerMenu/BurgerMenu.jsx";

import { formatDate, getUserTimeZone } from "../../utils/date.js";

import "./Header.css";

function Header({
  t,
  language,
  useLocalTime,
  setUseLocalTime,
  event,
  siteSettings,
  loading,
  error,
}) {

  const localTimeZone = getUserTimeZone();

  const activeTimeZone = useLocalTime ? localTimeZone : "UTC";

  return (
    <header className="header" id="home">
      <Container>
        <div className="header__top">
          <div className="header__brand">{siteSettings?.brandText || t.header.brand}</div>

          <BurgerMenu
            t={t}
            language={language}
            event={event}
            brandText={siteSettings?.brandText}
          />
        </div>

        <div className="header__content">
          {loading && <p className="header__message">{t.header.loading}</p>}

          {error && (
            <p className="header__message header__message--error">
              {t.header.loadError}
            </p>
          )}

          {!loading && event && (
            <>
              <div className="header__region-row">
                <div className="header__region">
                  <span>
                    {t.header.region} {event.region}
                  </span>

                  <strong>{event.regionName}</strong>
                </div>

                <div className="header__timezone">
                  <span>{useLocalTime ? t.header.localTime : t.header.utc}</span>

                  <button
                    type="button"
                    className={`header__timezone-toggle ${
                      useLocalTime ? "header__timezone-toggle--local" : ""
                    }`}
                    onClick={() => setUseLocalTime((current) => !current)}
                    aria-label={t.header.toggleTimeZone}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="header__info">
                <div className="header__info-card">
                  <div className="header__info-header">
                    <span className="header__info-title">
                      {t.header.wastelandDate}
                    </span>

                    <small className="header__time-zone">
                      {useLocalTime ? t.header.localTime : t.header.utc}
                    </small>
                  </div>

                  <strong>
                    {formatDate(
                      event.wastelandDate,
                      language,
                      activeTimeZone,
                      true,
                    )}
                  </strong>
                </div>

                <div className="header__info-card">
                  <div className="header__info-header">
                    <span className="header__info-title">
                      {t.header.registrationOpens}
                    </span>

                    <small className="header__time-zone">
                      {useLocalTime ? t.header.localTime : t.header.utc}
                    </small>
                  </div>

                  <strong>
                    {formatDate(
                      event.registrationOpensAt,
                      language,
                      activeTimeZone,
                      true,
                    )}
                  </strong>
                </div>

                <div className="header__info-card">
                  <div className="header__info-header">
                    <span className="header__info-title">
                      {t.header.registrationDeadline}
                    </span>

                    <small className="header__time-zone">
                      {useLocalTime ? t.header.localTime : t.header.utc}
                    </small>
                  </div>

                  <strong>
                    {formatDate(
                      event.registrationDeadline,
                      language,
                      activeTimeZone,
                      true,
                    )}
                  </strong>
                </div>

                <div className="header__info-card">
                  <span className="header__info-title">
                    {t.header.organizerAlliance}
                  </span>

                  <strong>{event.organizerAlliance}</strong>
                </div>

                <div className="header__info-card">
                  <span className="header__info-title">
                    {t.header.governor}
                  </span>

                  <strong>{event.governor}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}

export default Header;
