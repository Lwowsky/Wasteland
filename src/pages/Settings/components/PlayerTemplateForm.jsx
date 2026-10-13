import { useEffect, useMemo } from "react";

import { getEnabledRegistrationShifts } from "../../../features/registration/registrationShifts.js";
import { getEnabledRegistrationTiers } from "../../../features/registration/registrationTiers.js";
import { REGISTRATION_TROOP_TYPES } from "../../../../shared/registrationConfig.js";
import { TEMPLATE_ASSETS } from "../../../features/playerTemplates/templateAssets.js";

function PlayerTemplateForm({
  t,
  templateForm,
  setTemplateForm,
  onChange,
  onSave,
  onCancel,
  availableShifts = {},
  availableTiers = {},
}) {
  const enabledShifts = useMemo(
    () => getEnabledRegistrationShifts(availableShifts),
    [availableShifts],
  );

  const enabledTiers = useMemo(
    () => getEnabledRegistrationTiers(availableTiers),
    [availableTiers],
  );

  const fallbackTier = enabledTiers.includes("T10")
    ? "T10"
    : enabledTiers[0] || "";

  useEffect(() => {
    const shiftInvalid =
      enabledShifts.length > 0 && !enabledShifts.includes(templateForm.shift);
    const tierInvalid =
      enabledTiers.length > 0 && !enabledTiers.includes(templateForm.tier);
    const extraTierInvalid =
      enabledTiers.length > 0 &&
      REGISTRATION_TROOP_TYPES.some((type) => {
        const tier = templateForm.extraSquads?.[type]?.tier;
        return !enabledTiers.includes(tier);
      });

    if (!shiftInvalid && !tierInvalid && !extraTierInvalid) {
      return;
    }

    setTemplateForm((current) => ({
      ...current,
      shift: shiftInvalid ? enabledShifts[0] || "" : current.shift,
      tier: tierInvalid ? fallbackTier : current.tier,
      extraSquads: Object.fromEntries(
        REGISTRATION_TROOP_TYPES.map((type) => {
          const squad = current.extraSquads[type];
          return [
            type,
            {
              ...squad,
              tier:
                squad?.tier && enabledTiers.includes(squad.tier)
                  ? squad.tier
                  : fallbackTier,
            },
          ];
        }),
      ),
    }));
  }, [
    enabledShifts,
    enabledTiers,
    fallbackTier,
    templateForm.shift,
    templateForm.tier,
    templateForm.extraSquads,
    setTemplateForm,
  ]);

  function updateExtraSquad(type, field, value) {
    setTemplateForm((current) => ({
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

  return (
    <form className="template-form" onSubmit={onSave}>
      <div className="template-form__grid">
        <label>
          <span>{t.settings.templates.nickname}</span>

          <input
            name="nickname"
            value={templateForm.nickname}
            onChange={onChange}
            required
          />
        </label>

        <label>
          <span>{t.settings.templates.alliance}</span>

          <input
            name="alliance"
            value={templateForm.alliance}
            onChange={onChange}
            maxLength={3}
          />
        </label>

        <label>
          <span>{t.settings.templates.troopType}</span>

          <select
            name="troopType"
            value={templateForm.troopType}
            onChange={onChange}
          >
            <option value="fighter">{t.registration.troops.fighter}</option>

            <option value="rider">{t.registration.troops.rider}</option>

            <option value="shooter">{t.registration.troops.shooter}</option>
          </select>
        </label>

        <label>
          <span>{t.settings.templates.tier}</span>

          <select
            name="tier"
            value={templateForm.tier}
            onChange={onChange}
            disabled={enabledTiers.length === 0}
          >
            {enabledTiers.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>{t.settings.templates.lairLevel}</span>

          <input
            type="number"
            name="lairLevel"
            value={templateForm.lairLevel}
            onChange={onChange}
          />
        </label>

        <label>
          <span>{t.settings.templates.marchSize}</span>

          <input
            type="number"
            name="marchSize"
            value={templateForm.marchSize}
            onChange={onChange}
          />
        </label>

        <label>
          <span>{t.settings.templates.rallySize}</span>

          <input
            type="number"
            name="rallySize"
            value={templateForm.rallySize}
            onChange={onChange}
          />
        </label>

        <label>
          <span>{t.settings.templates.shift}</span>

          <select
            name="shift"
            value={templateForm.shift}
            onChange={onChange}
            required
          >
            {enabledShifts.map((shift) => (
              <option key={shift} value={shift}>
                {t.settings.templates[shift]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="template-extra">
        <div className="template-extra__header">
          <div>
            <h3>{t.settings.templates.extraSquads}</h3>

            <p>{t.settings.templates.extraSquadsText}</p>
          </div>
        </div>

        <div className="template-extra__grid">
          {REGISTRATION_TROOP_TYPES.filter((type) => type !== templateForm.troopType).map((type) => {
            const squad = templateForm.extraSquads[type];

            return (
              <div
                key={type}
                className={
                  squad.enabled
                    ? "template-extra__card template-extra__card--active"
                    : "template-extra__card"
                }
              >
                <img
                  className="template-extra__image"
                  src={TEMPLATE_ASSETS[type]}
                  alt=""
                  aria-hidden="true"
                />
                <label className="template-extra__toggle">
                  <input
                    type="checkbox"
                    checked={squad.enabled}
                    onChange={(event) =>
                      updateExtraSquad(type, "enabled", event.target.checked)
                    }
                  />

                  <span>{t.registration.troops[type]}</span>
                </label>

                <select
                  value={squad.tier}
                  disabled={!squad.enabled || enabledTiers.length === 0}
                  onChange={(event) =>
                    updateExtraSquad(type, "tier", event.target.value)
                  }
                >
                  {enabledTiers.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="template-form__actions">
        <button
          type="button"
          className="template-form__cancel"
          onClick={onCancel}
        >
          {t.settings.templates.cancel}
        </button>

        <button
          type="submit"
          className="template-form__save"
          disabled={enabledShifts.length === 0 || enabledTiers.length === 0}
        >
          <img className="template-action-icon" src={TEMPLATE_ASSETS.save} alt="" aria-hidden="true" />
          {t.settings.templates.save}
        </button>
      </div>
    </form>
  );
}

export default PlayerTemplateForm;
