import { useEffect, useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal.jsx";
import translations from "../../../i18n/index.js";
import { resolveEffectiveFooter } from "../../../features/site/footerSettings.js";
import { SUPPORTED_LANGUAGES } from "../../../config/site.js";
import { createSiteIdentityDraft, canSaveSiteIdentity, buildSiteIdentityPayload } from "./siteIdentityDraft.js";
import SiteIdentityFields from "./SiteIdentityFields.jsx";
import SiteFooterFields from "./SiteFooterFields.jsx";

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
    () => createSiteIdentityDraft(settings, translations, SUPPORTED_LANGUAGES),
    [settings],
  );
  const [draft, setDraft] = useState(initialDraft);
  const [confirmClose, setConfirmClose] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
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
    setRestoreMessage(copy.footer.restoreNotice);
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
    setRestoreMessage("");
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

    await onSave?.(buildSiteIdentityPayload(draft, settings, translations, SUPPORTED_LANGUAGES));
  }

  const canSave = canSaveSiteIdentity(draft);

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
        <SiteIdentityFields copy={copy} draft={draft} updateField={updateField} />

        <SiteFooterFields copy={copy} activeLanguage={activeLanguage}
          setActiveLanguage={setActiveLanguage} saving={saving}
          restoreLanguageDefaults={restoreLanguageDefaults} restoreMessage={restoreMessage}
          footerDraft={footerDraft} updateFooter={updateFooter} />

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
