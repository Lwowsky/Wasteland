import { publicAsset } from "../../../utils/publicAsset.js";

import {
  fromUtcDateTimeLocalValue,
  toUtcDateTimeLocalValue,
} from "../../../features/registration/registrationCycle.js";
import { getUtcTime } from "./registrationCycleDraft.js";

function SectionTitle({ icon, children }) {
  return (
    <h3 className="registration-cycle-section-title">
      <img src={icon} alt="" aria-hidden="true" />
      <span>{children}</span>
    </h3>
  );
}

function AutomaticCycleFields({ draft, schedule, canEdit, r, update }) {
  return (
    <>
      <section className="registration-modal-section registration-modal-section--compact">
        <SectionTitle icon={publicAsset("/images/registration-settings/alliances-and-wasteland-icon.webp")}>
          {r.cycle.wastelandTitle}
        </SectionTitle>

        <div className="registration-cycle-grid registration-cycle-grid--three">
          <label className="admin-field">
            <span>{r.cycle.anchor}</span>
            <input
              type="datetime-local"
              value={toUtcDateTimeLocalValue(draft.wastelandAnchorAt)}
              disabled={!canEdit}
              onChange={(event) =>
                update(
                  "wastelandAnchorAt",
                  fromUtcDateTimeLocalValue(event.target.value),
                )
              }
            />
          </label>

          <label className="admin-field">
            <span>{r.cycle.repeat}</span>
            <input
              type="number"
              min="1"
              max="60"
              value={draft.wastelandIntervalDays}
              disabled={!canEdit}
              onChange={(event) =>
                update("wastelandIntervalDays", Number(event.target.value))
              }
            />
          </label>

          <label className="admin-field">
            <span>{r.cycle.duration}</span>
            <input
              type="number"
              min="1"
              max="72"
              value={draft.wastelandDurationHours}
              disabled={!canEdit}
              onChange={(event) =>
                update("wastelandDurationHours", Number(event.target.value))
              }
            />
          </label>
        </div>
      </section>

      <div className="registration-cycle-pair">
        <section className="registration-modal-section registration-modal-section--compact">
          <SectionTitle icon={publicAsset("/images/registration-settings/cycle-close-icon.webp")}>
            {r.cycle.closeTitle}
          </SectionTitle>

          <div className="registration-cycle-grid">
            <label className="admin-field registration-cycle-field--wide">
              <span>{r.cycle.closeMode}</span>
              <select
                value={draft.registrationCloseMode}
                disabled={!canEdit}
                onChange={(event) =>
                  update("registrationCloseMode", event.target.value)
                }
              >
                <option value="gameDayReset">{r.cycle.closeGameDayReset}</option>
                <option value="hoursBeforeStart">{r.cycle.closeHoursBefore}</option>
              </select>
            </label>

            <label className="admin-field">
              <span>{r.cycle.closeTime}</span>
              <input
                type="time"
                value={getUtcTime(schedule.closesAt)}
                disabled
                readOnly
              />
            </label>

            {draft.registrationCloseMode === "hoursBeforeStart" && (
              <label className="admin-field">
                <span>{r.cycle.closeBeforeHours}</span>
                <input
                  type="number"
                  min="1"
                  max="336"
                  value={draft.registrationCloseBeforeHours}
                  disabled={!canEdit}
                  onChange={(event) =>
                    update(
                      "registrationCloseBeforeHours",
                      Number(event.target.value),
                    )
                  }
                />
              </label>
            )}
          </div>
        </section>

        <section className="registration-modal-section registration-modal-section--compact">
          <SectionTitle icon={publicAsset("/images/registration-settings/cycle-open-icon.webp")}>
            {r.cycle.openTitle}
          </SectionTitle>

          <div className="registration-cycle-grid">
            <label className="admin-field">
              <span>{r.cycle.openWeekday}</span>
              <select
                value={draft.registrationOpenWeekdayUtc}
                disabled={!canEdit}
                onChange={(event) =>
                  update("registrationOpenWeekdayUtc", Number(event.target.value))
                }
              >
                {r.cycle.weekdays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>{r.cycle.openTime}</span>
              <input
                type="time"
                value={draft.registrationOpenTimeUtc}
                disabled={!canEdit}
                onChange={(event) =>
                  update("registrationOpenTimeUtc", event.target.value)
                }
              />
            </label>
          </div>
        </section>
      </div>
    </>
  );
}

function ManualCycleFields({ draft, canEdit, r, update }) {
  return (
    <section className="registration-modal-section registration-modal-section--compact">
      <SectionTitle icon={publicAsset("/images/registration-settings/registration-fields-icon.webp")}>
        {r.cycle.manualTitle}
      </SectionTitle>

      <div className="registration-cycle-grid">
        <div className="registration-manual-date-block">
          <label className="admin-field">
            <span>{r.cycle.manualOpen}</span>
            <input
              type="datetime-local"
              value={toUtcDateTimeLocalValue(draft.manualOpensAt)}
              disabled={!canEdit}
              onChange={(event) =>
                update(
                  "manualOpensAt",
                  fromUtcDateTimeLocalValue(event.target.value),
                )
              }
            />
          </label>

          <label className="registration-inline-check">
            <input
              type="checkbox"
              checked={draft.autoOpenRegistration}
              disabled={!canEdit || Boolean(draft.manualOpensAt)}
              onChange={(event) =>
                update("autoOpenRegistration", event.target.checked)
              }
            />
            <span>{r.cycle.manualOpenFallback}</span>
          </label>
        </div>

        <div className="registration-manual-date-block">
          <label className="admin-field">
            <span>{r.cycle.manualClose}</span>
            <input
              type="datetime-local"
              value={toUtcDateTimeLocalValue(draft.manualClosesAt)}
              disabled={!canEdit}
              onChange={(event) =>
                update(
                  "manualClosesAt",
                  fromUtcDateTimeLocalValue(event.target.value),
                )
              }
            />
          </label>

          <label className="registration-inline-check">
            <input
              type="checkbox"
              checked={draft.autoCloseRegistration}
              disabled={!canEdit || Boolean(draft.manualClosesAt)}
              onChange={(event) =>
                update("autoCloseRegistration", event.target.checked)
              }
            />
            <span>{r.cycle.manualCloseFallback}</span>
          </label>
        </div>
      </div>

      <p className="registration-cycle-manual-note">
        {r.cycle.manualFallbackNote}
      </p>
    </section>
  );
}

export default function RegistrationCycleFields(props) {
  return props.draft.cycleMode === "automatic" ? (
    <AutomaticCycleFields {...props} />
  ) : (
    <ManualCycleFields {...props} />
  );
}
