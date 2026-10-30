import { publicAsset } from "../../../utils/publicAsset.js";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "../../../config/site.js";
import { SITE_FOOTER_LIMITS } from "../../../../shared/siteSettingsConfig.js";

const RESTORE_DEFAULTS_ICON = publicAsset("/images/registration-settings/reset-defaults-icon.webp");

export default function SiteFooterFields({ copy, activeLanguage, setActiveLanguage, saving,
  restoreLanguageDefaults, restoreMessage, footerDraft, updateFooter }) {
  return (
    <section className="site-identity-form__section">
      <div className="site-identity-form__section-head site-identity-form__section-head--footer">
        <div>
          <h3>{copy.footer.title}</h3>
          <p>{copy.footer.description}</p>
        </div>

        <div className="site-identity-form__footer-tools">
          <label className="site-identity-language-picker">
            <img
              className="site-identity-language-picker__flag"
              src={publicAsset(`/images/final-plan/lang/${activeLanguage}.svg`)}
              alt=""
              aria-hidden="true"
            />
            <select
              className="site-identity-language-picker__select"
              value={activeLanguage}
              aria-label={copy.footer.languageLabel}
              onChange={(event) => setActiveLanguage(event.target.value)}
              disabled={saving}
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGES[language]?.label || language.toUpperCase()} · {LANGUAGES[language]?.nativeLabel || language}
                </option>
              ))}
            </select>
            <span className="site-identity-language-picker__chevron" aria-hidden="true" />
          </label>

          <button
            type="button"
            className="site-identity-restore-defaults"
            onClick={restoreLanguageDefaults}
            disabled={saving}
            title={copy.footer.restoreHelp}
          >
            <img src={RESTORE_DEFAULTS_ICON} alt="" aria-hidden="true" />
            {copy.footer.restoreDefaults}
          </button>
        </div>
      </div>

      {restoreMessage && <p className="site-identity-restore-notice" role="status">{restoreMessage}</p>}

      <div className="site-identity-form__grid">
        <label className="site-identity-field site-identity-field--wide">
          <span>{copy.fields.footerDescription}</span>
          <textarea
            lang={activeLanguage}
            dir="auto"
            rows="2"
            maxLength={SITE_FOOTER_LIMITS.description}
            value={footerDraft.description || ""}
            onChange={(event) =>
              updateFooter("description", event.target.value)
            }
          />
        </label>

        <label className="site-identity-field">
          <span>{copy.fields.authorLabel}</span>
          <input
            lang={activeLanguage}
            dir="auto"
            maxLength={SITE_FOOTER_LIMITS.authorLabel}
            value={footerDraft.authorLabel || ""}
            onChange={(event) =>
              updateFooter("authorLabel", event.target.value)
            }
          />
        </label>

        <label className="site-identity-field">
          <span>{copy.fields.author}</span>
          <input
            lang={activeLanguage}
            dir="auto"
            maxLength={SITE_FOOTER_LIMITS.author}
            value={footerDraft.author || ""}
            onChange={(event) => updateFooter("author", event.target.value)}
          />
        </label>

        <label className="site-identity-field site-identity-field--wide">
          <span>{copy.fields.authorDescription}</span>
          <input
            lang={activeLanguage}
            dir="auto"
            maxLength={SITE_FOOTER_LIMITS.authorDescription}
            value={footerDraft.authorDescription || ""}
            onChange={(event) =>
              updateFooter("authorDescription", event.target.value)
            }
          />
        </label>

        <label className="site-identity-field site-identity-field--wide">
          <span>{copy.fields.projectDescription}</span>
          <textarea
            lang={activeLanguage}
            dir="auto"
            rows="2"
            maxLength={SITE_FOOTER_LIMITS.projectDescription}
            value={footerDraft.projectDescription || ""}
            onChange={(event) =>
              updateFooter("projectDescription", event.target.value)
            }
          />
        </label>

        <label className="site-identity-field site-identity-field--wide">
          <span>{copy.fields.copyright}</span>
          <input
            lang={activeLanguage}
            dir="auto"
            maxLength={SITE_FOOTER_LIMITS.copyright}
            value={footerDraft.copyright || ""}
            onChange={(event) =>
              updateFooter("copyright", event.target.value)
            }
          />
        </label>
      </div>

      <p className="site-identity-form__language-help">
        {copy.footer.languageHelp}
      </p>
    </section>
  );
}
