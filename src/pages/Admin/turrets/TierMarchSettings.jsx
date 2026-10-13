import { publicAsset } from "../../../utils/publicAsset.js";

import { getEnabledRegistrationTiers } from "../../../features/registration/registrationTiers.js";
import { updateOrderedTierLimits } from "../../../features/turrets/plannerTierDisplay.js";
import { updatePlannerSettings } from "../../../features/turrets/plannerSettings.js";

function TierMarchSettings({ a, settings, setSettings, disabled, registrationSettings }) {
  const t = a.distribution.limits;
  const availableTiers = registrationSettings?.availableTiers;
  const enabled = getEnabledRegistrationTiers(availableTiers).reverse();
  const update = (key, value) => setSettings((current) => updatePlannerSettings(current, key, value));
  const updateTier = (tier, value) => setSettings((current) => ({
    ...current,
    tierLimits: updateOrderedTierLimits(current, tier, value, enabled),
  }));
  return (
    <section className="planner-panel planner-tier-panel">
      <div className="planner-section-heading">
        <div>
          <h3 className="planner-tier-heading"><img src={publicAsset("/images/admin/region-editor/march.webp")} alt="" aria-hidden="true" />{t.tierTitle}</h3>
          <p>{settings.tierLimitsEnabled ? t.tierCustomDescription : t.tierAutoDescription}</p>
        </div>
      </div>
      <label className="planner-switch">
        <input type="checkbox" disabled={disabled} checked={settings.tierLimitsEnabled}
          onChange={(event) => update("tierLimitsEnabled", event.target.checked)} />
        <span>{t.useSaved}</span>
      </label>
      {enabled.length ? (
        <div className="planner-tier-grid">
          {enabled.map((tier) => (
            <label key={tier} className="planner-numeric-field">
              <span>{tier}</span>
              {settings.tierLimitsEnabled ? (
                <input type="number" inputMode="numeric" min="0" max="10000000" step="1000"
                  value={settings.tierLimits[tier] ?? 0} disabled={disabled}
                  onChange={(event) => updateTier(tier, event.target.value === "" ? 0 : Number(event.target.value))} />
              ) : (
                <output className="planner-tier-unlimited" aria-label={`${tier}: ${t.noLimit}`}>
                  {t.noLimit}
                </output>
              )}
            </label>
          ))}
        </div>
      ) : <p>{t.noEnabledTiers}</p>}
      <p className="planner-tier-hint">{settings.tierLimitsEnabled ? t.tierZeroHint : t.autoHint}</p>
    </section>
  );
}

export default TierMarchSettings;
