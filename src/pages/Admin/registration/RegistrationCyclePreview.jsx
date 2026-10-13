import useNow from "../../../hooks/useNow.js";
import { formatNumericDateTime } from "../../../utils/date.js";
import { formatRemainingTime } from "../../../features/registration/registrationCycle.js";

function Countdown({ target, r }) {
  const now = useNow(60_000);
  const remaining = formatRemainingTime(target, now);

  if (!remaining || remaining.passed) {
    return <span>{r.cycle.passed}</span>;
  }

  return (
    <span>
      {remaining.days} {r.cycle.daysShort} {remaining.hours}{" "}
      {r.cycle.hoursShort} {remaining.minutes} {r.cycle.minutesShort}
    </span>
  );
}

function PreviewItem({
  label,
  value,
  countdownLabel,
  language,
  localTimeZone,
  r,
  iconSrc,
  tone,
}) {
  return (
    <div
      className={`registration-cycle-preview__item registration-cycle-preview__item--${tone}`}
    >
      <div className="registration-cycle-preview__icon">
        <img src={iconSrc} alt="" aria-hidden="true" />
      </div>
      <span>{label}</span>
      <strong>{formatNumericDateTime(value, language, "UTC")} UTC</strong>
      <small>
        {formatNumericDateTime(value, language, localTimeZone)} {r.common.localTime}
      </small>
      {countdownLabel && (
        <em>
          {countdownLabel}: <Countdown target={value} r={r} />
        </em>
      )}
    </div>
  );
}

export default function RegistrationCyclePreview({
  schedule,
  language,
  localTimeZone,
  r,
}) {
  return (
    <section className="registration-cycle-preview registration-cycle-preview--compact">
      <div className="registration-cycle-preview__head">
        <strong>{r.cycle.previewTitle}</strong>
      </div>

      <div className="registration-cycle-preview__grid">
        <PreviewItem
          label={r.cycle.previewOpen}
          value={schedule.opensAt}
          countdownLabel={r.cycle.untilOpen}
          language={language}
          localTimeZone={localTimeZone}
          r={r}
          iconSrc="/images/registration-settings/cycle-open-icon.webp"
          tone="blue"
        />
        <PreviewItem
          label={r.cycle.previewClose}
          value={schedule.closesAt}
          countdownLabel={r.cycle.untilClose}
          language={language}
          localTimeZone={localTimeZone}
          r={r}
          iconSrc="/images/registration-settings/cycle-close-icon.webp"
          tone="red"
        />
        <PreviewItem
          label={r.cycle.previewStart}
          value={schedule.eventStartAt}
          language={language}
          localTimeZone={localTimeZone}
          r={r}
          iconSrc="/images/registration-settings/cycle-start-icon.webp"
          tone="gold"
        />
        <PreviewItem
          label={r.cycle.previewEnd}
          value={schedule.eventEndAt}
          language={language}
          localTimeZone={localTimeZone}
          r={r}
          iconSrc="/images/registration-settings/cycle-end-icon.webp"
          tone="violet"
        />
      </div>
    </section>
  );
}
