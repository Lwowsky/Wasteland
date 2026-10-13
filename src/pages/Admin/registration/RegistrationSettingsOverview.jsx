import { formatNumericDateTime, getUserTimeZone } from "../../../utils/date.js";
import RegistrationSectionCard from "./RegistrationSectionCard.jsx";

export default function RegistrationSettingsOverview({
  r,
  shifts,
  language,
  settings,
  summary,
  canEdit,
  onOpen,
}) {
  const localTimeZone = getUserTimeZone();
  const {
    enabledShifts,
    enabledTiers,
    requiredCount,
    visibleCount,
    allianceCount,
    rotation,
  } = summary;

  return (
    <div className="registration-overview-list">
      <RegistrationSectionCard
        className="registration-overview-card--wide"
        iconSrc="/images/registration-settings/registration-cycle-icon.webp"
        title={r.sections.cycle.title}
        description={r.sections.cycle.description}
        actionLabel={r.common.configure}
        disabled={!canEdit}
        onAction={() => onOpen("cycle")}
      >
        <div className="registration-cycle-summary registration-cycle-summary--compact">
          <div className="registration-cycle-summary__item registration-cycle-summary__item--blue">
            <img
              className="registration-cycle-summary__icon"
              src="/images/registration-settings/cycle-open-icon.webp"
              alt=""
              aria-hidden="true"
            />
            <div className="registration-cycle-summary__content">
              <span>{r.sections.cycle.opens}</span>
              <strong>
                {formatNumericDateTime(settings.opensAt, language, "UTC")} UTC
              </strong>
              <small>
                {formatNumericDateTime(
                  settings.opensAt,
                  language,
                  localTimeZone,
                )}{" "}
                {r.common.localTime}
              </small>
            </div>
          </div>

          <div className="registration-cycle-summary__item registration-cycle-summary__item--red">
            <img
              className="registration-cycle-summary__icon"
              src="/images/registration-settings/cycle-close-icon.webp"
              alt=""
              aria-hidden="true"
            />
            <div className="registration-cycle-summary__content">
              <span>{r.sections.cycle.closes}</span>
              <strong>
                {formatNumericDateTime(settings.closesAt, language, "UTC")} UTC
              </strong>
              <small>
                {formatNumericDateTime(
                  settings.closesAt,
                  language,
                  localTimeZone,
                )}{" "}
                {r.common.localTime}
              </small>
            </div>
          </div>

          <div className="registration-cycle-summary__item registration-cycle-summary__item--gold">
            <img
              className="registration-cycle-summary__icon"
              src="/images/registration-settings/cycle-start-icon.webp"
              alt=""
              aria-hidden="true"
            />
            <div className="registration-cycle-summary__content">
              <span>{r.sections.cycle.wasteland}</span>
              <strong>
                {formatNumericDateTime(
                  settings.nextWastelandAt,
                  language,
                  "UTC",
                )}{" "}
                UTC
              </strong>
              <small>
                {formatNumericDateTime(
                  settings.nextWastelandAt,
                  language,
                  localTimeZone,
                )}{" "}
                {r.common.localTime}
              </small>
            </div>
          </div>

          <div className="registration-summary-badge">
            <img
              src={
                settings.cycleMode === "manual"
                  ? "/images/registration-settings/registration-fields-icon.webp"
                  : "/images/registration-settings/registration-cycle-icon.webp"
              }
              alt=""
              aria-hidden="true"
            />
            <span>
              {settings.cycleMode === "manual"
                ? r.sections.cycle.manual
                : r.sections.cycle.automatic}
            </span>
          </div>
        </div>
      </RegistrationSectionCard>

      <RegistrationSectionCard
        iconSrc="/images/registration-settings/available-shifts-icon.webp"
        title={r.sections.shifts.title}
        description={r.sections.shifts.description}
        actionLabel={r.common.configure}
        disabled={!canEdit}
        onAction={() => onOpen("shifts")}
      >
        <div className="registration-summary-tags">
          {enabledShifts.map((shift) => (
            <span key={shift}>{shifts[shift]}</span>
          ))}
        </div>
      </RegistrationSectionCard>

      <RegistrationSectionCard
        iconSrc="/images/registration-settings/available-tiers-icon.webp"
        title={r.sections.tiers.title}
        description={r.sections.tiers.description}
        actionLabel={r.common.configure}
        disabled={!canEdit}
        onAction={() => onOpen("tiers")}
      >
        <div className="registration-summary-tags">
          {enabledTiers.map((tier) => (
            <span key={tier}>{tier}</span>
          ))}
        </div>
      </RegistrationSectionCard>

      <RegistrationSectionCard
        iconSrc="/images/registration-settings/alliances-and-wasteland-icon.webp"
        title={r.sections.wasteland.title}
        description={r.sections.wasteland.description}
        actionLabel={r.common.configure}
        disabled={!canEdit}
        onAction={() => onOpen("wasteland")}
      >
        <div className="registration-summary-details">
          <span>
            <b>{r.sections.wasteland.hostAlliance}:</b>{" "}
            {settings.hostAlliance || r.common.notSet}
          </span>
          <span>
            <b>{r.sections.wasteland.governor}:</b>{" "}
            {settings.governor || r.common.notSet}
          </span>
          <span>
            <b>{r.sections.wasteland.alliances}:</b> {allianceCount}
          </span>
          <span>
            <b>{r.sections.wasteland.rotation}:</b>{" "}
            {rotation.length ? rotation.join(" → ") : r.common.notSet}
          </span>
        </div>
      </RegistrationSectionCard>

      <RegistrationSectionCard
        iconSrc="/images/registration-settings/registration-fields-icon.webp"
        title={r.sections.formFields.title}
        description={r.sections.formFields.description}
        actionLabel={r.common.configure}
        disabled={!canEdit}
        onAction={() => onOpen("formFields")}
      >
        <div className="registration-summary-details">
          <span>
            <b>{r.sections.formFields.visible}:</b> {visibleCount}
          </span>
          <span>
            <b>{r.sections.formFields.required}:</b> {requiredCount}
          </span>
        </div>
      </RegistrationSectionCard>
    </div>
  );
}
