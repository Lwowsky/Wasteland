import { CalendarDays, Timer } from "lucide-react";

import CountdownValue from "../components/CountdownValue.jsx";
import useNow from "../../../hooks/useNow.js";
import { getCountdown } from "../utils/time.js";

function CountdownSection({ t, event }) {
  const now = useNow(1000);
  const registrationCountdown = getCountdown(event?.registrationDeadline, now);
  const eventCountdown = getCountdown(event?.wastelandDate, now);
  return (
    <section className="home-countdowns">
      <article className="home-countdown-card home-countdown-card--registration">
        <div className="home-countdown-card__top">
          <div>
            <Timer size={26} />

            <div>
              <h2>{t.home.dashboard.registrationCountdown.title}</h2>

              <p>{t.home.dashboard.registrationCountdown.subtitle}</p>
            </div>
          </div>

          <span className="home-status">
            ● {t.home.dashboard.registrationCountdown.open}
          </span>
        </div>

        <div className="home-countdown">
          <CountdownValue
            value={registrationCountdown.days}
            label={t.home.dashboard.time.days}
          />

          <CountdownValue
            value={registrationCountdown.hours}
            label={t.home.dashboard.time.hours}
          />

          <CountdownValue
            value={registrationCountdown.minutes}
            label={t.home.dashboard.time.minutes}
          />

          <CountdownValue
            value={registrationCountdown.seconds}
            label={t.home.dashboard.time.seconds}
          />
        </div>
      </article>

      <article className="home-countdown-card home-countdown-card--event">
        <div className="home-countdown-card__top">
          <div>
            <CalendarDays size={26} />

            <div>
              <h2>{t.home.dashboard.eventCountdown.title}</h2>

              <p>{t.home.dashboard.eventCountdown.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="home-countdown">
          <CountdownValue
            value={eventCountdown.days}
            label={t.home.dashboard.time.days}
          />

          <CountdownValue
            value={eventCountdown.hours}
            label={t.home.dashboard.time.hours}
          />

          <CountdownValue
            value={eventCountdown.minutes}
            label={t.home.dashboard.time.minutes}
          />

          <CountdownValue
            value={eventCountdown.seconds}
            label={t.home.dashboard.time.seconds}
          />
        </div>
      </article>
    </section>
  );
}

export default CountdownSection;
