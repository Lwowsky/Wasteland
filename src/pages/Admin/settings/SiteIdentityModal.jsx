import { publicAsset } from "../../../utils/publicAsset.js";

import { useEffect, useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal.jsx";
import translations from "../../../i18n/index.js";
import {
  buildFooterOverrides,
  createFooterDrafts,
  resolveEffectiveFooter,
} from "../../../features/site/footerSettings.js";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "../../../config/site.js";
import {
  SITE_FOOTER_LIMITS,
  SITE_SETTINGS_LIMITS,
} from "../../../../shared/siteSettingsConfig.js";

const SITE_APPEARANCE_ICON = publicAsset("/images/admin/icons/settings/site-appearance.webp");
const SITE_NAME_ICON = publicAsset("/images/admin/icons/settings/identity-site-name.webp");
const BRAND_ICON = publicAsset("/images/admin/icons/settings/identity-brand-text.webp");
const REGION_PIN_ICON = publicAsset("/images/admin/icons/settings/identity-region-pin.webp");
const REGION_NAME_ICON = publicAsset("/images/admin/icons/settings/identity-region-name.webp");
const RESTORE_DEFAULTS_ICON = publicAsset("/images/registration-settings/reset-defaults-icon.webp");

function SiteIdentityModal({
  open,
  onClose,
  copy,
  settings,
  saving,
  error,
  onSave,
}) {
  const initialLanguage = SUPPORTED_LANGUAGES[0] || "en";
  const [activeLanguage, setActiveLanguage] = useState(initialLanguage);
  const initialDraft = useMemo(
    () => ({
      siteName: settings?.siteName || "",
      brandText: settings?.brandText || "",
      regionNumber: String(settings?.regionNumber ?? ""),
      regionName: settings?.regionName || "",
      footerByLanguage: createFooterDrafts(
        settings,
        translations,
        SUPPORTED_LANGUAGES,
      ),
    }),
    [settings],
  );
  const [draft, setDraft] = useState(initialDraft);
  const [confirmClose, setConfirmClose] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  const footerDraft = draft.footerByLanguage?.[activeLanguage] || {};

  useEffect(() => {
    if (!open || saving || !isDirty) return undefined;

    function warnBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [open, saving, isDirty]);

  function requestClose() {
    if (saving) return;
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onClose?.();
  }

  function restoreLanguageDefaults() {
    setDraft((current) => ({
      ...current,
      footerByLanguage: {
        ...current.footerByLanguage,
        [activeLanguage]: resolveEffectiveFooter(
          translations[activeLanguage]?.footer,
        ),
      },
    }));
  }

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateFooter(field, value) {
    setDraft((current) => ({
      ...current,
      footerByLanguage: {
        ...current.footerByLanguage,
        [activeLanguage]: {
          ...(current.footerByLanguage?.[activeLanguage] || {}),
          [field]: value,
        },
      },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await onSave?.({
      ...draft,
      regionNumber: Number(draft.regionNumber),
      footerByLanguage: buildFooterOverrides(
        draft.footerByLanguage,
        settings,
        translations,
        SUPPORTED_LANGUAGES,
      ),
    });
  }

  const canSave =
    draft.siteName.trim().length > 0 &&
    draft.brandText.trim().length > 0 &&
    draft.regionName.trim().length > 0 &&
    Number.isInteger(Number(draft.regionNumber)) &&
    Number(draft.regionNumber) >= SITE_SETTINGS_LIMITS.regionNumberMin &&
    Number(draft.regionNumber) <= SITE_SETTINGS_LIMITS.regionNumberMax;

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : requestClose}
      closeOnBackdrop={!confirmClose && !saving}
      closeOnEscape={!confirmClose && !saving}
      title={copy.modal.title}
      subtitle={copy.modal.subtitle}
      closeLabel={copy.actions.close}
      width="900px"
      className="site-identity-modal"
      footer={
        <div className="site-identity-modal__footer">
          <span className={isDirty ? "is-dirty" : ""}>
            {isDirty ? copy.modal.unsaved : copy.modal.footerHint}
          </span>
          <div>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={requestClose}
              disabled={saving}
            >
              {copy.actions.cancel}
            </button>
            <button
              type="submit"
              form="site-identity-form"
              className="admin-primary-button"
              disabled={saving || !canSave}
            >
              {saving ? copy.actions.saving : copy.actions.save}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="site-identity-form"
        className="site-identity-form"
        onSubmit={handleSubmit}
      >
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

        {error && <div className="site-identity-form__error">{error}</div>}
      </form>

      <ConfirmModal
        open={confirmClose}
        title={copy.unsaved.title}
        message={copy.unsaved.message}
        confirmLabel={copy.unsaved.discard}
        cancelLabel={copy.unsaved.keepEditing}
        closeLabel={copy.unsaved.keepEditing}
        tone="warning"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => onClose?.()}
      />
    </Modal>
  );
}

export default SiteIdentityModal;
