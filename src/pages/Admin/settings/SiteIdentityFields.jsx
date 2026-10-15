import { publicAsset } from "../../../utils/publicAsset.js";
import { SITE_SETTINGS_LIMITS } from "../../../../shared/siteSettingsConfig.js";

const SITE_APPEARANCE_ICON = publicAsset("/images/admin/icons/settings/site-appearance.webp");
const SITE_NAME_ICON = publicAsset("/images/admin/icons/settings/identity-site-name.webp");
const BRAND_ICON = publicAsset("/images/admin/icons/settings/identity-brand-text.webp");
const REGION_PIN_ICON = publicAsset("/images/admin/icons/settings/identity-region-pin.webp");
const REGION_NAME_ICON = publicAsset("/images/admin/icons/settings/identity-region-name.webp");

export default function SiteIdentityFields({ copy, draft, updateField }) {
  return (
    <section className="site-identity-form__section">
      <div className="site-identity-form__section-head">
        <div className="site-identity-form__section-icon">
          <img src={SITE_APPEARANCE_ICON} alt="" aria-hidden="true" />
        </div>
        <div>
          <h3>{copy.identity.title}</h3>
          <p>{copy.identity.description}</p>
        </div>
      </div>

      <div className="site-identity-form__grid">
        <label className="site-identity-field">
          <span>{copy.fields.siteName}</span>
          <div className="site-identity-field__with-icon">
            <img className="site-identity-field__icon-image" src={SITE_NAME_ICON} alt="" aria-hidden="true" />
            <input
              value={draft.siteName}
              maxLength={SITE_SETTINGS_LIMITS.siteName}
              onChange={(event) => updateField("siteName", event.target.value)}
            />
          </div>
          <small>{copy.help.siteName}</small>
        </label>

        <label className="site-identity-field">
          <span>{copy.fields.brandText}</span>
          <div className="site-identity-field__with-icon">
            <img className="site-identity-field__icon-image" src={BRAND_ICON} alt="" aria-hidden="true" />
            <input
              value={draft.brandText}
              maxLength={SITE_SETTINGS_LIMITS.brandText}
              onChange={(event) =>
                updateField("brandText", event.target.value)
              }
            />
          </div>
          <small>{copy.help.brandText}</small>
        </label>

        <label className="site-identity-field">
          <span>{copy.fields.regionNumber}</span>
          <div className="site-identity-field__with-icon">
            <img className="site-identity-field__icon-image" src={REGION_PIN_ICON} alt="" aria-hidden="true" />
            <input
              type="number"
              min={SITE_SETTINGS_LIMITS.regionNumberMin}
              max={SITE_SETTINGS_LIMITS.regionNumberMax}
              value={draft.regionNumber}
              onChange={(event) =>
                updateField("regionNumber", event.target.value)
              }
            />
          </div>
        </label>

        <label className="site-identity-field">
          <span>{copy.fields.regionName}</span>
          <div className="site-identity-field__with-icon">
            <img className="site-identity-field__icon-image" src={REGION_NAME_ICON} alt="" aria-hidden="true" />
            <input
              value={draft.regionName}
              maxLength={SITE_SETTINGS_LIMITS.regionName}
              onChange={(event) =>
                updateField("regionName", event.target.value)
              }
            />
          </div>
        </label>
      </div>
    </section>
  );
}
