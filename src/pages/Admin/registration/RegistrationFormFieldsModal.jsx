import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import RegistrationModalFooter from "./RegistrationModalFooter.jsx";
import { REGISTRATION_FORM_FIELDS } from "../../../features/registration/registrationSettings.js";

function createCustomFieldId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `custom-${Date.now()}`;
}

function RegistrationFormFieldsModal({
  open,
  onClose,
  r,
  settings,
  canEdit,
  saving,
  onSave,
}) {
  const [visibleFields, setVisibleFields] = useState(() => ({
    ...settings.visibleFields,
  }));
  const [requiredFields, setRequiredFields] = useState(() => ({
    ...settings.requiredFields,
  }));
  const [customFields, setCustomFields] = useState(() =>
    Array.isArray(settings.customFields)
      ? settings.customFields.map((field) => ({ ...field }))
      : [],
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");

  function toggleVisible(field, checked) {
    setVisibleFields((current) => ({
      ...current,
      [field]: checked,
    }));

    if (!checked) {
      setRequiredFields((current) => ({
        ...current,
        [field]: false,
      }));
    }
  }

  function toggleRequired(field, checked) {
    setRequiredFields((current) => ({
      ...current,
      [field]: checked,
    }));
  }

  function addCustomField() {
    const label = newFieldLabel.trim();

    if (!label) {
      return;
    }

    setCustomFields((current) => [
      ...current,
      {
        id: createCustomFieldId(),
        label,
        visible: true,
        required: false,
      },
    ]);
    setNewFieldLabel("");
  }

  function updateCustomField(id, patch) {
    setCustomFields((current) =>
      current.map((field) => {
        if (field.id !== id) {
          return field;
        }

        const next = { ...field, ...patch };

        if (next.visible === false) {
          next.required = false;
        }

        return next;
      }),
    );
  }

  function removeCustomField(id) {
    setCustomFields((current) => current.filter((field) => field.id !== id));
  }

  async function handleSave() {
    await onSave({
      visibleFields,
      requiredFields,
      customFields,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="980px"
      title={r.formFieldsModal.title}
      subtitle={r.formFieldsModal.description}
      closeLabel={r.common.close}
      footer={
        <RegistrationModalFooter
          onClose={onClose}
          onSave={handleSave}
          cancelLabel={r.common.cancel}
          saveLabel={r.formFieldsModal.save}
          savingLabel={r.common.saving}
          saving={saving}
          disabled={!canEdit}
        />
      }
    >
      <div className="registration-modal-stack">
        <section className="registration-modal-section registration-modal-section--compact">
          <div className="registration-required-list">
            <div className="registration-required-list__head">
              <span>{r.formFieldsModal.field}</span>
              <span>{r.formFieldsModal.visible}</span>
              <span>{r.formFieldsModal.required}</span>
            </div>

            {REGISTRATION_FORM_FIELDS.map((field) => {
              const visible = visibleFields[field] !== false;

              return (
                <div key={field} className="registration-required-row">
                  <span>{r.formFieldsModal.fields[field]}</span>

                  <input
                    type="checkbox"
                    checked={visible}
                    disabled={!canEdit}
                    aria-label={`${r.formFieldsModal.visible}: ${r.formFieldsModal.fields[field]}`}
                    onChange={(event) =>
                      toggleVisible(field, event.target.checked)
                    }
                  />

                  <input
                    type="checkbox"
                    checked={requiredFields[field] === true}
                    disabled={!canEdit || !visible}
                    aria-label={`${r.formFieldsModal.required}: ${r.formFieldsModal.fields[field]}`}
                    onChange={(event) =>
                      toggleRequired(field, event.target.checked)
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="registration-modal-section registration-modal-section--compact">
          <h3>{r.formFieldsModal.customTitle}</h3>
          <p>{r.formFieldsModal.customDescription}</p>

          <div className="registration-custom-field-add">
            <label className="admin-field">
              <span>{r.formFieldsModal.customLabel}</span>
              <input
                type="text"
                value={newFieldLabel}
                disabled={!canEdit}
                placeholder={r.formFieldsModal.customPlaceholder}
                onChange={(event) => setNewFieldLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomField();
                  }
                }}
              />
            </label>

            <button
              type="button"
              className="registration-secondary-button registration-custom-field-add__button"
              disabled={!canEdit || !newFieldLabel.trim()}
              onClick={addCustomField}
            >
              <Plus size={17} aria-hidden="true" />
              {r.formFieldsModal.addCustom}
            </button>
          </div>

          {customFields.length === 0 ? (
            <div className="registration-empty-state">
              {r.formFieldsModal.customEmpty}
            </div>
          ) : (
            <div className="registration-custom-field-list">
              <div className="registration-custom-field-list__head">
                <span>{r.formFieldsModal.field}</span>
                <span>{r.formFieldsModal.visible}</span>
                <span>{r.formFieldsModal.required}</span>
                <span />
              </div>

              {customFields.map((field) => (
                <div key={field.id} className="registration-custom-field-row">
                  <input
                    type="text"
                    value={field.label}
                    disabled={!canEdit}
                    aria-label={r.formFieldsModal.customLabel}
                    onChange={(event) =>
                      updateCustomField(field.id, { label: event.target.value })
                    }
                  />

                  <input
                    type="checkbox"
                    checked={field.visible !== false}
                    disabled={!canEdit}
                    aria-label={`${r.formFieldsModal.visible}: ${field.label}`}
                    onChange={(event) =>
                      updateCustomField(field.id, {
                        visible: event.target.checked,
                      })
                    }
                  />

                  <input
                    type="checkbox"
                    checked={field.required === true}
                    disabled={!canEdit || field.visible === false}
                    aria-label={`${r.formFieldsModal.required}: ${field.label}`}
                    onChange={(event) =>
                      updateCustomField(field.id, {
                        required: event.target.checked,
                      })
                    }
                  />

                  <button
                    type="button"
                    disabled={!canEdit}
                    aria-label={r.formFieldsModal.removeCustom}
                    onClick={() => removeCustomField(field.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

export default RegistrationFormFieldsModal;
