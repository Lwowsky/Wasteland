import { Crosshair, Shield, Users } from "lucide-react";

import { getEnabledRegistrationTiers } from "../registrationTiers.js";
import { REGISTRATION_TROOP_TYPES } from "../../../../shared/registrationConfig.js";

import "./ExtraSquadsSection.css";


function ExtraSquadsSection({
  t,
  data,
  setData,
  required = false,
  availableTiers = {},
  visible = true,
  invalid = false,
}) {
  const extraSquads = data.extraSquads;
  const mainTroopType = data.troopType;

  const enabledTiers = getEnabledRegistrationTiers(availableTiers);

  const enabledExtraTypes = REGISTRATION_TROOP_TYPES.filter(
    (type) => type !== mainTroopType && extraSquads[type]?.enabled === true,
  );

  const hasAnyExtra = enabledExtraTypes.length > 0;

  function resetExtraSquads() {
    setData((current) => ({
      ...current,
      extraSquads: {
        fighter: { ...current.extraSquads.fighter, enabled: false },
        rider: { ...current.extraSquads.rider, enabled: false },
        shooter: { ...current.extraSquads.shooter, enabled: false },
      },
    }));
  }

  function enableFirstAvailableSquad() {
    const firstAvailable = REGISTRATION_TROOP_TYPES.find((type) => type !== mainTroopType);

    if (!firstAvailable) {
      return;
    }

    setData((current) => ({
      ...current,
      extraSquads: {
        ...current.extraSquads,
        [firstAvailable]: {
          ...current.extraSquads[firstAvailable],
          enabled: true,
        },
      },
    }));
  }

  function handleMasterToggle(event) {
    const checked = event.target.checked;

    if (!checked) {
      resetExtraSquads();
      return;
    }

    if (!hasAnyExtra) {
      enableFirstAvailableSquad();
    }
  }

  function updateSquad(type, field, value) {
    if (type === mainTroopType) {
      return;
    }

    if (field === "enabled" && value === true) {
      const currentEnabled = REGISTRATION_TROOP_TYPES.filter(
        (item) =>
          item !== type &&
          item !== mainTroopType &&
          extraSquads[item]?.enabled === true,
      ).length;

      if (currentEnabled >= 2) {
        return;
      }
    }

    setData((current) => ({
      ...current,
      extraSquads: {
        ...current.extraSquads,
        [type]: {
          ...current.extraSquads[type],
          [field]: value,
        },
      },
    }));
  }

  function renderSquad({ type, icon }) {
    const squad = extraSquads[type];
    const isMain = mainTroopType === type;
    const Icon = icon;

    return (
      <div className={`extra-squad extra-squad--${type}`}>
        <div className="extra-squad__title">
          <Icon size={22} />
          <strong>{t.registration.troops[type]}</strong>
        </div>

        <label className="extra-squad__enable">
          <input
            type="checkbox"
            name={`extra-${type}`}
            checked={!isMain && squad.enabled}
            disabled={isMain || !mainTroopType}
            onChange={(event) =>
              updateSquad(type, "enabled", event.target.checked)
            }
          />

          {isMain ? t.registration.player.troopType : t.registration.extra.enable}
        </label>

        <select
          name={`extra-${type}-tier`}
          value={squad.tier}
          disabled={isMain || !squad.enabled}
          onChange={(event) => updateSquad(type, "tier", event.target.value)}
        >
          {enabledTiers.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <section
      className={`registration-section ${
        invalid ? "registration-field--invalid" : ""
      }`}
      data-registration-field="extraSquads"
    >
      <div className="registration-section__heading">
        <Users size={22} />

        <div>
          <h2>
            {t.registration.extra.title}
            {required && <span className="form-field__required"> *</span>}
          </h2>
          <p>{t.registration.extra.text}</p>
        </div>
      </div>

      <label className="extra-squads-toggle">
        <input
          type="checkbox"
          checked={hasAnyExtra}
          required={required}
          disabled={!mainTroopType}
          onChange={handleMasterToggle}
        />
        <span>{t.registration.extra.hasExtra}</span>
      </label>

      <div className={`extra-squads ${!hasAnyExtra ? "extra-squads--disabled" : ""}`}>
        {renderSquad({ type: "fighter", icon: Shield })}
        {renderSquad({ type: "rider", icon: Users })}
        {renderSquad({ type: "shooter", icon: Crosshair })}
      </div>
    </section>
  );
}

export default ExtraSquadsSection;
