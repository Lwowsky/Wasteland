import { useState } from "react";

import { publicAsset } from "../../../utils/publicAsset.js";

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
  const [extrasExpanded, setExtrasExpanded] = useState(hasAnyExtra);
  const extrasVisible = extrasExpanded || hasAnyExtra;

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

  function handleMasterToggle(event) {
    const checked = event.target.checked;

    setExtrasExpanded(checked);
    if (!checked) {
      resetExtraSquads();
      return;
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

  function renderSquad(type) {
    const squad = extraSquads[type];
    const isMain = mainTroopType === type;

    return (
      <div
        key={type}
        className={`extra-squad extra-squad--${type}${isMain ? " extra-squad--main" : ""}`}
        style={{
          "--extra-squad-image": `url(${publicAsset(`/images/registration/${type}.webp`)})`,
        }}
      >
        <div className="extra-squad__title">
          <img src={publicAsset(`/images/admin/troops/${type}.webp`)} alt="" aria-hidden="true" />
          <strong>{t.registration.troops[type]}</strong>
        </div>

        <label className="extra-squad__enable">
          <input
            type="checkbox"
            name={`extra-${type}`}
            checked={!isMain && squad.enabled}
            disabled={isMain || !mainTroopType}
            onChange={(event) => updateSquad(type, "enabled", event.target.checked)}
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
        <img
          className="registration-section__heading-image"
          src={publicAsset("/images/admin/icons/actions/players.webp")}
          alt=""
          aria-hidden="true"
        />

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
          checked={extrasVisible}
          required={required}
          onChange={handleMasterToggle}
        />
        <span>{t.registration.extra.hasExtra}</span>
      </label>

      {extrasVisible && (
        <div className="extra-squads">
          {REGISTRATION_TROOP_TYPES.map(renderSquad)}
        </div>
      )}
    </section>
  );
}

export default ExtraSquadsSection;
