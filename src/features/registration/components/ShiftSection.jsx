import { Clock3 } from "lucide-react";

import { formatShiftTime } from "../../../utils/date.js";
import { getEnabledRegistrationShifts } from "../registrationShifts.js";
import "./ShiftSection.css";

function ShiftSection({
  t,
  language,
  useLocalTime,
  data,
  setData,
  availableShifts,
  required = false,
  visible = true,
  invalid = false,
}) {
  const shiftTimes = {
    shift1: formatShiftTime(0, 8, useLocalTime, language),
    shift2: formatShiftTime(8, 16, useLocalTime, language),
  };

  const enabledShifts = getEnabledRegistrationShifts(availableShifts);

  function handleShiftChange(event) {
    setData((current) => ({
      ...current,
      shift: event.target.value,
    }));
  }

  if (!visible) {
    return null;
  }

  return (
    <section
      className={`registration-section ${
        invalid ? "registration-field--invalid" : ""
      }`}
      data-registration-field="shift"
    >
      <div className="registration-section__heading">
        <Clock3 size={22} aria-hidden="true" />

        <div>
          <h2>
            {t.registration.shifts.title}
            {required && <span className="form-field__required"> *</span>}
          </h2>
          <p>{t.registration.shifts.text}</p>
        </div>
      </div>

      <div className="shift-grid">
        {enabledShifts.map((shift) => (
          <label key={shift} className={`shift-card shift-card--${shift}`}>
            <input
              type="radio"
              name="shift"
              value={shift}
              checked={data.shift === shift}
              required={required}
              onChange={handleShiftChange}
            />

            <span>
              <strong>{t.registration.shifts[shift]}</strong>
              {shiftTimes[shift] && <small>{shiftTimes[shift]}</small>}
              {shift === "flexible" && (
                <small>{t.registration.shifts.flexibleText}</small>
              )}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default ShiftSection;
