import { Save } from "lucide-react";
import { useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import useCountdown from "../../../hooks/useCountdown.js";
import { REGISTRATION_SHIFTS } from "../../../features/registration/registrationShifts.js";

function createDefaultMapping(conflicts, enabledShifts) {
  const enabled = REGISTRATION_SHIFTS.filter(
    (shift) => enabledShifts?.[shift] === true,
  );
  const hasShift1 = enabled.includes("shift1");
  const hasShift2 = enabled.includes("shift2");
  const hasFlexible = enabled.includes("flexible");

  return Object.fromEntries(
    conflicts.map(({ shift }) => {
      if ((shift === "shift1" || shift === "shift2") && hasShift1) {
        return [shift, "shift1"];
      }

      if ((shift === "shift3" || shift === "shift4") && hasShift2) {
        return [shift, "shift2"];
      }

      if (hasFlexible) {
        return [shift, "flexible"];
      }

      return [shift, enabled[0] || ""];
    }),
  );
}

function RegistrationShiftRemapModal({
  open,
  onClose,
  r,
  shifts,
  conflicts,
  enabledShifts,
  saving,
  onSave,
}) {
  const availableTargets = useMemo(
    () =>
      REGISTRATION_SHIFTS.filter((shift) => enabledShifts?.[shift] === true),
    [enabledShifts],
  );
  const [mapping, setMapping] = useState(() =>
    createDefaultMapping(conflicts, enabledShifts),
  );
  const secondsLeft = useCountdown({
    active: open,
    seconds: 10,
    resetKey: conflicts.map(({ shift, count }) => `${shift}:${count}`).join("|"),
  });

  const valid = conflicts.every(({ shift }) =>
    availableTargets.includes(mapping[shift]),
  );

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      width="760px"
      title={r.shiftRemap.title}
      subtitle={r.shiftRemap.description}
      closeLabel={r.common.close}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
      footer={
        <div className="registration-modal-footer">
          <button
            type="button"
            className="registration-secondary-button"
            disabled={saving}
            onClick={onClose}
          >
            {r.common.cancel}
          </button>

          <button
            type="button"
            className="admin-primary-button"
            disabled={saving || secondsLeft > 0 || !valid}
            onClick={() => onSave(mapping)}
          >
            <Save size={17} aria-hidden="true" />
            {saving
              ? r.common.saving
              : secondsLeft > 0
                ? `${r.shiftRemap.apply} (${secondsLeft})`
                : r.shiftRemap.apply}
          </button>
        </div>
      }
    >
      <div className="registration-remap-list">
        {conflicts.map(({ shift, count }) => (
          <div key={shift} className="registration-remap-row">
            <div>
              <strong>{shifts[shift]}</strong>
              <span>
                {count} {r.shiftRemap.players}
              </span>
            </div>

            <span className="registration-remap-row__arrow">→</span>

            <select
              value={mapping[shift] || ""}
              disabled={saving}
              onChange={(event) =>
                setMapping((current) => ({
                  ...current,
                  [shift]: event.target.value,
                }))
              }
            >
              {availableTargets.map((target) => (
                <option key={target} value={target}>
                  {shifts[target]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default RegistrationShiftRemapModal;
