import { Crosshair } from "lucide-react";
import "./ReadinessSection.css";

function ReadinessSection({
  t,
  data,
  setData,
  requiredFields = {},
  visibleFields = {},
  invalidFields = new Set(),
}) {
  const showAttack = visibleFields.readyAttack !== false;
  const showCaptain = visibleFields.captain !== false;

  function handleChange(field, value) {
    setData((current) => ({
      ...current,
      readiness: {
        ...current.readiness,
        [field]: value,
      },
    }));
  }

  if (!showAttack && !showCaptain) {
    return null;
  }

  return (
    <section className="registration-section">
      <div className="registration-section__heading">
        <Crosshair size={22} />

        <div>
          <h2>{t.registration.readiness.title}</h2>
          <p>{t.registration.readiness.text}</p>
        </div>
      </div>

      <div className="readiness-grid">
        {showAttack && (
          <label
            className={`choice-card choice-card--attack ${
              invalidFields.has("readyAttack")
                ? "registration-field--invalid"
                : ""
            }`}
            data-registration-field="readyAttack"
          >
            <input
              type="checkbox"
              name="readyAttack"
              checked={data.readiness.attack}
              required={requiredFields.readyAttack === true}
              onChange={(event) => handleChange("attack", event.target.checked)}
            />

            <span className="choice-card__content">
              <strong>
                {t.registration.readiness.attack}
                {requiredFields.readyAttack === true && (
                  <span className="form-field__required"> *</span>
                )}
              </strong>
              <small>{t.registration.readiness.attackText}</small>
            </span>
          </label>
        )}

        {showCaptain && (
          <label
            className={`choice-card choice-card--captain ${
              invalidFields.has("captain")
                ? "registration-field--invalid"
                : ""
            }`}
            data-registration-field="captain"
          >
            <input
              type="checkbox"
              name="readyCaptain"
              checked={data.readiness.captain}
              required={requiredFields.captain === true}
              onChange={(event) => handleChange("captain", event.target.checked)}
            />

            <span className="choice-card__content">
              <strong>
                {t.registration.readiness.captain}
                {requiredFields.captain === true && (
                  <span className="form-field__required"> *</span>
                )}
              </strong>
              <small>{t.registration.readiness.captainText}</small>
            </span>
          </label>
        )}
      </div>
    </section>
  );
}

export default ReadinessSection;
