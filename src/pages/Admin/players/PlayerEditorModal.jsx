import { useState } from "react";

import { Save, X } from "lucide-react";
import { publicAsset } from "../../../utils/publicAsset.js";

import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal.jsx";
import Modal from "../../../components/Modal/Modal.jsx";

import PlayerMainFields from "./PlayerMainFields.jsx";
import PlayerExtraSquads from "./PlayerExtraSquads.jsx";

import {
  createEmptyPlayer,
  normalizePlayerForm,
  playerToForm,
  validatePlayerForm,
} from "./playerForm.js";

import "../styles/players/PlayerEditorModal.css";

function replaceName(template, name) {
  return String(template || "").replace("{{name}}", name || "");
}

function PlayerEditorModal({
  t,
  mode,
  player,
  saving,
  canDelete,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  registrationSettings,
}) {
  const [form, setForm] = useState(() =>
    mode === "edit" ? playerToForm(player) : createEmptyPlayer(),
  );

  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validatePlayerForm(form, t);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    const values = normalizePlayerForm(form);

    try {
      if (mode === "edit") {
        await onUpdate(player.id, values);
      } else {
        await onCreate(values);
      }

      onClose();
    } catch (submitError) {
      console.error("Save player:", submitError);

      setError(t.errors.save);
    }
  }

  function handleDelete() {
    if (!player || !canDelete) {
      return;
    }

    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    try {
      await onDelete(player);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (deleteError) {
      console.error("Delete player:", deleteError);
      setDeleteConfirmOpen(false);
      setError(t.errors.delete);
    }
  }

  const footer = (
    <>
      <div>
        {mode === "edit" && canDelete && (
          <button
            type="button"
            className="player-editor-button player-editor-button--danger"
            disabled={saving}
            onClick={handleDelete}
          >
            <img className="player-editor-button__icon" src={publicAsset("/images/admin/icons/actions/delete.webp")} alt="" aria-hidden="true" width="18" height="18" />

            {t.actions.delete}
          </button>
        )}
      </div>

      <div className="player-editor-footer-actions">
        <button
          type="button"
          className="player-editor-button player-editor-button--secondary"
          disabled={saving}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />

          {t.actions.cancel}
        </button>

        <button
          type="submit"
          form="player-editor-form"
          className="player-editor-button player-editor-button--primary"
          disabled={saving}
        >
          <Save size={18} aria-hidden="true" />

          {saving ? t.actions.saving : t.actions.save}
        </button>
      </div>
    </>
  );

  return (
    <>
      <Modal
      open
      onClose={onClose}
      width="1080px"
      title={mode === "edit" ? t.editor.editTitle : t.editor.createTitle}
      subtitle={
        mode === "edit"
          ? replaceName(t.editor.editSubtitle, player?.nickname)
          : t.editor.createSubtitle
      }
      footer={footer}
      className="player-editor-site-modal"
      closeLabel={t.actions.cancel}
    >
      <form
        id="player-editor-form"
        className="player-editor-form"
        onSubmit={handleSubmit}
      >
        <PlayerMainFields
          t={t}
          form={form}
          setForm={setForm}
          registrationSettings={registrationSettings}
        />

        <PlayerExtraSquads t={t} form={form} setForm={setForm} />

        {error && <div className="player-editor-error">{error}</div>}
      </form>
      </Modal>

      <ConfirmModal
        open={deleteConfirmOpen}
        title={t.actions.delete}
        message={replaceName(t.editor.confirmDelete, player?.nickname)}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
        closeLabel={t.actions.cancel}
        tone="danger"
        busy={saving}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default PlayerEditorModal;
