import { Save } from "lucide-react";

function RegistrationModalFooter({
  onClose,
  onSave,
  cancelLabel,
  saveLabel,
  savingLabel,
  saving = false,
  disabled = false,
}) {
  return (
    <div className="registration-modal-footer">
      <button
        type="button"
        className="registration-secondary-button"
        onClick={onClose}
      >
        {cancelLabel}
      </button>

      <button
        type="button"
        className="admin-primary-button"
        disabled={disabled || saving}
        onClick={onSave}
      >
        <Save size={17} aria-hidden="true" />
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}

export default RegistrationModalFooter;
