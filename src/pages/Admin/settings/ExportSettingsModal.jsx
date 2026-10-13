import { CheckSquare2, Square } from "lucide-react";

import Modal from "../../../components/Modal/Modal.jsx";
import "./ExportSettingsModal.css";

function ExportSettingsModal({ open, onClose, t, fields, selected, onChange }) {
  const selectedCount = fields.filter((field) => selected[field.id] !== false).length;
  const allSelected = fields.length > 0 && selectedCount === fields.length;

  function setAll(value) {
    onChange(
      Object.fromEntries(fields.map((field) => [field.id, value])),
    );
  }

  function toggle(fieldId) {
    onChange({
      ...selected,
      [fieldId]: selected[fieldId] === false,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title}
      subtitle={t.subtitle}
      width="760px"
      closeLabel={t.close}
      footer={
        <div className="settings-modal-footer">
          <span>{t.selected.replace("{{count}}", selectedCount)}</span>
          <button type="button" className="admin-primary-button" onClick={onClose}>
            {t.done}
          </button>
        </div>
      }
    >
      <div className="export-settings-modal">
        <button
          type="button"
          className="export-settings-select-all"
          onClick={() => setAll(!allSelected)}
        >
          {allSelected ? <CheckSquare2 size={19} /> : <Square size={19} />}
          <span>{allSelected ? t.clearAll : t.selectAll}</span>
        </button>

        <div className="export-settings-list">
          {fields.map((field) => (
            <label key={field.id} className="export-settings-row">
              <input
                type="checkbox"
                checked={selected[field.id] !== false}
                onChange={() => toggle(field.id)}
              />
              <span>
                <strong>{field.label}</strong>
                {field.custom && <small>{t.customField}</small>}
              </span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default ExportSettingsModal;
