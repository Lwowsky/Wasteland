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
          <div
            className="site-identity-language-tabs"
            role="tablist"
            aria-label={copy.footer.languageLabel}
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language}
                type="button"
                role="tab"
                aria-selected={activeLanguage === language}
                className={activeLanguage === language ? "is-active" : ""}
                onClick={() => setActiveLanguage(language)}
              >
                {LANGUAGES[language]?.label || language.toUpperCase()}
              </button>
            ))}
          </div>

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
            maxLength={SITE_FOOTER_LIMITS.author}
            value={footerDraft.author || ""}
            onChange={(event) => updateFooter("author", event.target.value)}
          />
        </label>

        <label className="site-identity-field site-identity-field--wide">
          <span>{copy.fields.authorDescription}</span>
          <input
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
