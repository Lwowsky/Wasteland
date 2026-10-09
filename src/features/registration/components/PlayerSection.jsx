import {
  ChevronsUp,
  Flag,
  FlaskConical,
  Swords,
  User,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { getEnabledRegistrationTiers } from "../registrationTiers.js";

import "./PlayerSection.css";

const OTHER_ALLIANCE_VALUE = "__other__";

function RequiredMark({ required }) {
  return required ? <span className="form-field__required">*</span> : null;
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
    () => new Set(alliances.map((alliance) => alliance.tag)),
    [alliances],
  );

  const [allianceMode, setAllianceMode] = useState(() => {
    if (!data.alliance) {
      return "list";
    }

    return allianceTags.has(data.alliance) ? "list" : "other";
  });

  const allianceIsListed = allianceTags.has(data.alliance);
  const manualAllianceActive =
    allianceMode === "other" && !allianceIsListed;


  const visible = (field) => visibleFields[field] !== false;
  const required = (field) => visible(field) && requiredFields[field] === true;

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
    }));
  }

  function handleAllianceSelect(event) {
    const value = event.target.value;

    if (value === OTHER_ALLIANCE_VALUE) {
      setAllianceMode("other");

      setData((current) => ({
        ...current,
        alliance: "",
      }));

      return;
    }

    setAllianceMode("list");

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
        <span className="registration-section__number">1</span>

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
                  <User size={19} />
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
                  <Users size={19} />
                  {t.registration.player.alliance}
                  <RequiredMark required={required("alliance")} />
                </span>

                <select
                  value={
                    manualAllianceActive ? OTHER_ALLIANCE_VALUE : data.alliance
                  }
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
                  <Swords size={19} />
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
                  invalidFields.has("tier")
                    ? "registration-field--invalid"
                    : ""
                }`}
                data-registration-field="tier"
              >
                <span className="form-field__label">
                  <ChevronsUp size={19} />
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
                  <FlaskConical size={19} />
                  {t.registration.player.lairLevel}
                  <RequiredMark required={required("lairLevel")} />
                </span>

                <input
                  type="number"
                  name="lairLevel"
                  value={data.lairLevel}
                  onChange={handleChange}
                  min="1"
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
                  <Users size={19} />
                  {t.registration.player.marchSize}
                  <RequiredMark required={required("marchSize")} />
                </span>

                <input
                  type="number"
                  name="marchSize"
                  value={data.marchSize}
                  onChange={handleChange}
                  min="0"
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
                  <Flag size={19} />
                  {t.registration.player.rallySize}
                  <RequiredMark required={required("rallySize")} />
                </span>

                <input
                  type="number"
                  name="rallySize"
                  value={data.rallySize}
                  onChange={handleChange}
                  min="0"
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
