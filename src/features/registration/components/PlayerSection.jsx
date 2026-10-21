import { useMemo, useState } from "react";

import { getEnabledRegistrationTiers } from "../registrationTiers.js";
import {
  isRegistrationFieldVisible,
  isRegistrationFieldRequired,
} from "../../../../shared/registrationFieldRules.js";
import { normalizeTemplateExtraSquads } from "../../playerTemplates/playerTemplatesStorage.js";
import { REGISTRATION_FIELD_ICONS } from "../../playerTemplates/templateAssets.js";

import "./PlayerSection.css";

const OTHER_ALLIANCE_VALUE = "__other__";

function RequiredMark({ required }) {
  return required ? <span className="form-field__required" aria-hidden="true">*</span> : null;
}

function FieldIcon({ name, src }) {
  const iconSrc = src || REGISTRATION_FIELD_ICONS[name];
  return <img className="form-field__icon" src={iconSrc} alt="" aria-hidden="true" />;
}

function normalizeAllianceValue(value = "") {
  return String(value).trim().toUpperCase();
}

function PlayerSection({
  t,
  data,
  setData,
  requiredFields = {},
  visibleFields = {},
  availableTiers = {},
  alliances = [],
  invalidFields = new Set(),
}) {
  const enabledTiers = getEnabledRegistrationTiers(availableTiers);

  const allianceTags = useMemo(
    () => new Set(alliances.map((alliance) => normalizeAllianceValue(alliance.tag))),
    [alliances],
  );

  // The input value is the source of truth, including when a template fills it.
  // Local state is only needed while the user explicitly selects "other" before typing.
  const [manualAllianceRequested, setManualAllianceRequested] = useState(false);
  const allianceIsListed = allianceTags.has(normalizeAllianceValue(data.alliance));
  const manualAllianceActive =
    !allianceIsListed && (manualAllianceRequested || Boolean(data.alliance));

  const visible = (field) => isRegistrationFieldVisible(visibleFields, field);
  const required = (field) => isRegistrationFieldRequired(visibleFields, requiredFields, field);

  const hasVisibleFields = [
    "nickname",
    "alliance",
    "troopType",
    "tier",
    "lairLevel",
    "marchSize",
    "rallySize",
  ].some(visible);

  function handleChange(event) {
    const { name, value } = event.target;

    setData((current) => ({
      ...current,
      [name]: value,
      ...(name === "troopType"
        ? {
            extraSquads: normalizeTemplateExtraSquads(current.extraSquads, value),
          }
        : {}),
    }));
  }

  function handleAllianceSelect(event) {
    const value = event.target.value;

    if (value === OTHER_ALLIANCE_VALUE) {
      setManualAllianceRequested(true);

      setData((current) => ({
        ...current,
        alliance: "",
      }));

      return;
    }

    setManualAllianceRequested(false);

    setData((current) => ({
      ...current,
      alliance: value,
    }));
  }

  function handleManualAllianceChange(event) {
    const value = event.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3);

    setData((current) => ({
      ...current,
      alliance: value,
    }));
  }

  if (!hasVisibleFields) {
    return null;
  }

  return (
    <section className="registration-section">
      <div className="registration-section__title-row">
        <div>
          <h2 className="registration-section__title">
            {t.registration.player.title}
          </h2>

          <p className="registration-section__description">
            {t.registration.player.text}
          </p>
        </div>
      </div>

      <div className="player-layout">
        {(visible("nickname") || visible("alliance")) && (
          <div className="player-row player-row--two">
            {visible("nickname") && (
              <label
                className={`form-field ${
                  invalidFields.has("nickname")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="nickname"
              >
                <span className="form-field__label">
                  <FieldIcon name="nickname" />
                  {t.registration.player.nickname}
                  <RequiredMark required={required("nickname")} />
                </span>

                <input
                  type="text"
                  name="nickname"
                  value={data.nickname}
                  onChange={handleChange}
                  placeholder={t.registration.player.nicknamePlaceholder}
                  required={required("nickname")}
                />
              </label>
            )}

            {visible("alliance") && (
              <div
                className={`form-field ${
                  invalidFields.has("alliance")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="alliance"
              >
                <span className="form-field__label">
                  <FieldIcon name="alliance" />
                  {t.registration.player.alliance}
                  <RequiredMark required={required("alliance")} />
                </span>

                <select
                  value={manualAllianceActive ? OTHER_ALLIANCE_VALUE : data.alliance}
                  onChange={handleAllianceSelect}
                >
                  <option value="">
                    {t.registration.player.alliancePlaceholder}
                  </option>

                  {alliances.map((alliance) => (
                    <option key={alliance.tag} value={alliance.tag}>
                      {alliance.tag} — {alliance.name}
                    </option>
                  ))}

                  <option value={OTHER_ALLIANCE_VALUE}>
                    {t.registration.player.otherAlliance}
                  </option>
                </select>

                {manualAllianceActive && (
                  <input
                    type="text"
                    name="alliance"
                    value={data.alliance}
                    onChange={handleManualAllianceChange}
                    maxLength={3}
                    placeholder={t.registration.player.allianceManualPlaceholder}
                    aria-label={t.registration.player.allianceManualLabel}
                    required={required("alliance")}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {(visible("troopType") || visible("tier") || visible("lairLevel")) && (
          <div className="player-row player-row--three">
            {visible("troopType") && (
              <label
                className={`form-field ${
                  invalidFields.has("troopType")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="troopType"
              >
                <span className="form-field__label">
                  <FieldIcon name="troopType" />
                  {t.registration.player.troopType}
                  <RequiredMark required={required("troopType")} />
                </span>

                <select
                  name="troopType"
                  value={data.troopType}
                  onChange={handleChange}
                  required={required("troopType")}
                >
                  <option value="">{t.registration.player.select}</option>
                  <option value="fighter">{t.registration.troops.fighter}</option>
                  <option value="rider">{t.registration.troops.rider}</option>
                  <option value="shooter">{t.registration.troops.shooter}</option>
                </select>
              </label>
            )}

            {visible("tier") && (
              <label
                className={`form-field ${
                  invalidFields.has("tier") ? "registration-field--invalid" : ""
                }`}
                data-registration-field="tier"
              >
                <span className="form-field__label">
                  <FieldIcon name="tier" />
                  {t.registration.player.tier}
                  <RequiredMark required={required("tier")} />
                </span>

                <select
                  name="tier"
                  value={data.tier}
                  onChange={handleChange}
                  required={required("tier")}
                >
                  <option value="">{t.registration.player.select}</option>
                  {enabledTiers.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {visible("lairLevel") && (
              <label
                className={`form-field ${
                  invalidFields.has("lairLevel")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="lairLevel"
              >
                <span className="form-field__label">
                  <FieldIcon name="lairLevel" />
                  {t.registration.player.lairLevel}
                  <RequiredMark required={required("lairLevel")} />
                </span>

                <input
                  type="number"
                  name="lairLevel"
                  min="1"
                  max="99"
                  value={data.lairLevel}
                  onChange={handleChange}
                  required={required("lairLevel")}
                />
              </label>
            )}
          </div>
        )}

        {(visible("marchSize") || visible("rallySize")) && (
          <div className="player-row player-row--two">
            {visible("marchSize") && (
              <label
                className={`form-field ${
                  invalidFields.has("marchSize")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="marchSize"
              >
                <span className="form-field__label">
                  <FieldIcon name="marchSize" />
                  {t.registration.player.marchSize}
                  <RequiredMark required={required("marchSize")} />
                </span>

                <input
                  type="number"
                  name="marchSize"
                  min="1"
                  value={data.marchSize}
                  onChange={handleChange}
                  required={required("marchSize")}
                />
              </label>
            )}

            {visible("rallySize") && (
              <label
                className={`form-field ${
                  invalidFields.has("rallySize")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="rallySize"
              >
                <span className="form-field__label">
                  <FieldIcon name="rallySize" />
                  {t.registration.player.rallySize}
                  <RequiredMark required={required("rallySize")} />
                </span>

                <input
                  type="number"
                  name="rallySize"
                  min="1"
                  value={data.rallySize}
                  onChange={handleChange}
                  required={required("rallySize")}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default PlayerSection;
