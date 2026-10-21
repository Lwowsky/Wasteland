import { publicAsset } from "../../../utils/publicAsset.js";
import { isValidRegionBackup } from "../../../../shared/regionBackupValidation.js";

import { RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import useCountdown from "../../../hooks/useCountdown.js";
import {
  createRegionBackup,
  downloadRegionBackup,
  restoreRegionBackup,
  restoreWastelandClientData,
} from "../services/systemSettingsApi.js";
import "./SystemSettingsModal.css";
import "./RegionBackupPanel.css";

const COUNTDOWN_SECONDS = 10;
const BACKUPS_CLOUD_ICON = publicAsset("/images/admin/icons/settings/backups-cloud.webp");
const PLAYERS_IMPORT_ICON = publicAsset("/images/admin/icons/settings/players-import.webp");

function formatCount(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0";
}

function RegionBackupPanel({ t, onRestored }) {
  const restorePhrase = t.restoreModal.phrase;
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const secondsLeft = useCountdown({
    active: restoreOpen,
    seconds: COUNTDOWN_SECONDS,
    resetKey: selectedBackup?.createdAt || "restore-region",
  });

  async function handleCreateBackup() {
    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const result = await createRegionBackup();
      downloadRegionBackup(result.backup);
      setSuccess(t.created);
    } catch (backupError) {
      console.error("Create region backup:", backupError);
      setError(t.errors.create);
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!isValidRegionBackup(payload)) {
        throw new Error("INVALID_REGION_BACKUP");
      }

      setSelectedBackup(payload);
      setConfirmation("");
      setRestoreOpen(true);
    } catch (fileError) {
      console.error("Read region backup:", fileError);
      setSelectedBackup(null);
      setError(t.errors.invalidFile);
    }
  }

  function closeRestore() {
    if (restoreBusy) {
      return;
    }

    setRestoreOpen(false);
    setSelectedBackup(null);
    setConfirmation("");
  }

  async function handleRestore() {
    if (
      restoreBusy ||
      secondsLeft > 0 ||
      confirmation.trim() !== restorePhrase ||
      !selectedBackup
    ) {
      return;
    }

    try {
      setRestoreBusy(true);
      setError("");

      // Download an independent rollback file BEFORE the destructive API call.
      // The server also snapshots immediately before applying the replacement.
      const beforeRestore = await createRegionBackup();
      if (!beforeRestore?.backup) throw new Error("BACKUP_PRECHECK_FAILED");
      downloadRegionBackup(beforeRestore.backup, "before-restore");

      const result = await restoreRegionBackup({
        backup: selectedBackup,
        confirmed: true,
      });

      if (result.rollbackBackup) {
        downloadRegionBackup(result.rollbackBackup, "server-before-restore");
      }

      restoreWastelandClientData(selectedBackup.clientData);
      setRestoreOpen(false);
      setSelectedBackup(null);
      setSuccess(t.restored);
      await onRestored?.();
    } catch (restoreError) {
      console.error("Restore region backup:", restoreError);
      setError(t.errors.restore);
      setRestoreBusy(false);
    }
  }

  const counts = selectedBackup?.counts || {};
  const canRestore =
    !restoreBusy &&
    secondsLeft === 0 &&
    confirmation.trim() === restorePhrase;

  return (
    <>
      <article className="settings-tool-card settings-backup-card">
        <div className="admin-export-icon settings-backup-icon" aria-hidden="true">
          <img
            className="settings-section-icon"
            src={BACKUPS_CLOUD_ICON}
            alt=""
          />
        </div>
        <h3>{t.title}</h3>
        <p>{t.description}</p>

        {error && <div className="settings-inline-error">{error}</div>}
        {success && <div className="settings-inline-success">{success}</div>}

        <div className="settings-backup-actions">
          <button
            type="button"
            className="admin-primary-button"
            disabled={busy}
            onClick={handleCreateBackup}
          >
            <img
              className="settings-backup-button-icon"
              src={BACKUPS_CLOUD_ICON}
              alt=""
              aria-hidden="true"
            />
            {busy ? t.creating : t.create}
          </button>

          <button
            type="button"
            className="admin-secondary-button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <img
              className="settings-backup-button-icon"
              src={PLAYERS_IMPORT_ICON}
              alt=""
              aria-hidden="true"
            />
            {t.restore}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
        />

        <small className="settings-backup-note">{t.note}</small>
      </article>

      {restoreOpen && selectedBackup && (
        <Modal
          open
          onClose={closeRestore}
          closeOnBackdrop={!restoreBusy}
          closeOnEscape={!restoreBusy}
          width="760px"
          title={t.restoreModal.title}
          subtitle={t.restoreModal.subtitle}
          closeLabel={t.restoreModal.cancel}
          className="backup-restore-modal"
          footer={
            <div className="factory-reset-footer">
              <button
                type="button"
                className="admin-secondary-button"
                disabled={restoreBusy}
                onClick={closeRestore}
              >
                {t.restoreModal.cancel}
              </button>
              <button
                type="button"
                className="factory-reset-danger-button"
                disabled={!canRestore}
                onClick={handleRestore}
              >
                <RotateCcw size={17} aria-hidden="true" />
                {secondsLeft > 0
                  ? `${t.restoreModal.confirm} (${secondsLeft})`
                  : restoreBusy
                    ? t.restoreModal.restoring
                    : t.restoreModal.confirm}
              </button>
            </div>
          }
        >
          <div className="backup-restore-content">
            <div className="factory-reset-warning">
              <img className="settings-backup-callout-icon" src={BACKUPS_CLOUD_ICON} alt="" aria-hidden="true" />
              <div>
                <strong>{t.restoreModal.warningTitle}</strong>
                <p>{t.restoreModal.warningText}</p>
              </div>
            </div>

            <div className="backup-restore-summary">
              <span>{t.restoreModal.createdAt}: <strong>{selectedBackup.createdAt ? new Date(selectedBackup.createdAt).toLocaleString() : "—"}</strong></span>
              <span>{t.restoreModal.players}: <strong>{formatCount(counts.registrations)}</strong></span>
              <span>{t.restoreModal.periods}: <strong>{formatCount(counts.periods)}</strong></span>
              <span>{t.restoreModal.alliances}: <strong>{formatCount(counts.alliances)}</strong></span>
              <span>{t.restoreModal.requests}: <strong>{formatCount(counts.accessRequests)}</strong></span>
            </div>

            <label className="factory-reset-confirmation">
              <span>{t.restoreModal.phraseLabel}</span>
              <code>{restorePhrase}</code>
              <input
                value={confirmation}
                disabled={restoreBusy}
                autoComplete="off"
                spellCheck="false"
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={restorePhrase}
              />
              <small>{t.restoreModal.help}</small>
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

export default RegionBackupPanel;
