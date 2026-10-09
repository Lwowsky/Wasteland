import { ChevronRight } from "lucide-react";

function RegistrationSectionCard({
  icon: Icon,
  iconSrc = "",
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
  className = "",
  children,
}) {
  const classes = ["registration-overview-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <div className="registration-overview-card__head">
        <div className="registration-overview-card__identity">
          <div className="registration-overview-card__icon">
            {iconSrc ? (
              <img src={iconSrc} alt="" aria-hidden="true" />
            ) : (
              <Icon size={21} aria-hidden="true" />
            )}
          </div>

          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>

        <button
          type="button"
          className="registration-configure-button"
          disabled={disabled}
          onClick={onAction}
        >
          <span>{actionLabel}</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="registration-overview-card__body">{children}</div>
    </section>
  );
}

export default RegistrationSectionCard;
