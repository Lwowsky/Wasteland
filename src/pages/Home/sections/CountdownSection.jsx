import CountdownValue from "../components/CountdownValue.jsx";
import useNow from "../../../hooks/useNow.js";
import { getCountdown } from "../utils/time.js";
import { getHomeCountdownPhases } from "../utils/homeCountdownPhases.js";

const TIME_UNITS = ["days", "hours", "minutes", "seconds"];

function CountdownCells({ target, now, labels, unavailableText }) {
  if (!target) {
    return <p className="home-countdown-unavailable">{unavailableText || labels.unscheduled}</p>;
  }

  const remaining = getCountdown(target, now);

  return (
    <div className="home-countdown">
      {TIME_UNITS.map((unit) => (
        <CountdownValue key={unit} value={remaining[unit]} label={labels[unit]} />
      ))}
    </div>
  );
}

function CountdownSection({ t, registrationConfig }) {
  const now = useNow(1000);
  const states = getHomeCountdownPhases(registrationConfig?.settings, now);
  const registration = states?.registration;
  const event = states?.event;
  const registrationLabels = t.home.dashboard.registrationCountdown;
  const eventLabels = t.home.dashboard.eventCountdown;
  if (!states) {
    return <section className="home-countdowns" aria-busy="true">
      <p className="home-loading">{t.home.dashboard.loading}</p>
    </section>;
  }

  const registrationOpen = registration?.phase === "open";
  const registrationDisabled = registration?.phase === "disabled";
  const eventActive = event?.phase === "active";

  const registrationTitle = registrationOpen
    ? registrationLabels.title
    : registrationLabels.closedTitle;
  const registrationSubtitle = registrationOpen
    ? registrationLabels.subtitle
    : registrationDisabled
      ? registrationLabels.disabledSubtitle
      : registrationLabels.closedSubtitle;
  const registrationStatus = registrationOpen
    ? registrationLabels.open
    : registrationLabels.closed;

  return (
    <section className="home-countdowns">
      <article className={`home-countdown-card home-countdown-card--registration${registrationOpen ? "" : " home-countdown-card--closed"}`}>
        <div className="home-countdown-card__top">
          <div>
            <img
              className="home-countdown-card__icon"
              src={registrationOpen
                ? "/images/registration-settings/cycle-open-icon.webp"
                : "/images/registration-settings/cycle-close-icon.webp"}
              alt=""
              aria-hidden="true"
            />
            <div>
              <h2>{registrationTitle}</h2>
              <p>{registrationSubtitle}</p>
            </div>
          </div>
          <span className={`home-status${registrationOpen ? "" : " home-status--closed"}`}>
            {registrationStatus}
          </span>
        </div>
        <CountdownCells
          target={registration?.target}
          now={now}
          labels={t.home.dashboard.time}
          unavailableText={registrationDisabled
            ? registrationLabels.disabledCountdown
            : t.home.dashboard.time.unscheduled}
        />
      </article>

      <article className={`home-countdown-card home-countdown-card--event${eventActive ? " home-countdown-card--active" : ""}`}>
        <div className="home-countdown-card__top">
          <div>
            <img
              className="home-countdown-card__icon"
              src={eventActive
                ? "/images/registration-settings/alliances-and-wasteland-icon.webp"
                : "/images/registration-settings/cycle-start-icon.webp"}
              alt=""
              aria-hidden="true"
            />
            <div>
              <h2>{eventActive ? eventLabels.activeTitle : eventLabels.title}</h2>
              <p>{eventActive ? eventLabels.activeSubtitle : eventLabels.subtitle}</p>
            </div>
          </div>
          {eventActive && (
            <span className="home-status home-status--active">{eventLabels.active}</span>
          )}
        </div>
        <CountdownCells target={event?.target} now={now} labels={t.home.dashboard.time} />
      </article>
    </section>
  );
}

export default CountdownSection;
