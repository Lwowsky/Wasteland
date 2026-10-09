import { AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import useCountdown from "../../../hooks/useCountdown.js";
import {
  createRegionBackup,
  downloadRegionBackup,
  factoryResetRegion,
  getFactoryResetPreview,
} from "../services/systemSettingsApi.js";
import "./SystemSettingsModal.css";
import "./FactoryResetModal.css";

const COUNTDOWN_SECONDS = 10;

const RESET_KEYS = [
  "players",
  "cycles",
  "alliances",
  "registrationSettings",
  "accessRequests",
  "browserData",
];

function createDefaultSelection() {
  return Object.fromEntries(RESET_KEYS.map((key) => [key, true]));
}

function FactoryResetModal({ open, onClose, t, onCompleted }) {
  const confirmationPhrase = t.confirmation.phrase;
  const [selection, setSelection] = useState(createDefaultSelection);
  const [confirmation, setConfirmation] = useState("");
  const secondsLeft = useCountdown({
    active: open,
    seconds: COUNTDOWN_SECONDS,
    resetKey: "factory-reset",
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloadBackup, setDownloadBackup] = useState(true);
  const [errorKey, setErrorKey] = useState("");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;

    async function loadPreview() {
      try {
        setLoadingPreview(true);
        const result = await getFactoryResetPreview();

        if (active) {
          setPreview(result.counts || null);
        }
      } catch (previewError) {
        console.error("Factory reset preview:", previewError);

        if (active) {
          setErrorKey("preview");
        }
      } finally {
        if (active) {
          setLoadingPreview(false);
        }
      }
    }

    loadPreview();

    return () => {
      active = false;
    };
  }, [open]);

  const deleteAll = useMemo(
    () => RESET_KEYS.every((key) => selection[key] === true),
    [selection],
  );

  const selectedServerKeys = useMemo(
    () =>
      RESET_KEYS.filter((key) => key !== "browserData").filter(
        (key) => selection[key],
      ),
    [selection],
  );

  function toggleDeleteAll() {
    const nextValue = !deleteAll;
    setSelection(
      Object.fromEntries(RESET_KEYS.map((key) => [key, nextValue])),
    );
  }

  function toggle(key) {
    setSelection((current) => {
      const next = {
        ...current,
        [key]: !current[key],
      };

      if (key === "cycles" && next.cycles) {
        next.players = true;
      }

      return next;
    });
  }

  const canConfirm =
    !busy &&
    secondsLeft === 0 &&
    confirmation.trim() === confirmationPhrase &&
    (selectedServerKeys.length > 0 || selection.browserData);

  async function handleReset() {
    if (!canConfirm) {
      return;
    }

    try {
      setBusy(true);
      setErrorKey("");

      if (downloadBackup && selectedServerKeys.length > 0) {
        try {
          const backupResult = await createRegionBackup();
          downloadRegionBackup(backupResult.backup, "before-factory-reset");
        } catch (backupError) {
          console.error("Factory reset backup:", backupError);
          setErrorKey("backup");
          setBusy(false);
          return;
        }
      }

      if (selectedServerKeys.length > 0) {
        await factoryResetRegion({
          deleteAll:
            selection.players &&
            selection.cycles &&
            selection.alliances &&
            selection.registrationSettings &&
            selection.accessRequests,
          selection: {
            players: selection.players,
            cycles: selection.cycles,
            alliances: selection.alliances,
            registrationSettings: selection.registrationSettings,
            accessRequests: selection.accessRequests,
          },
          confirmed: true,
        });
      }

      await onCompleted({ clearBrowserData: selection.browserData });
    } catch (resetError) {
      console.error("Factory reset:", resetError);
      setErrorKey("reset");
      setBusy(false);
    }
  }

  function formatCount(value) {
    return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      width="820px"
      title={t.modal.title}
      subtitle={t.modal.subtitle}
      closeLabel={t.actions.cancel}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      className="factory-reset-modal"
      footer={
        <div className="factory-reset-footer">
          <button
            type="button"
            className="admin-secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            {t.actions.cancel}
          </button>

          <button
            type="button"
            className="factory-reset-danger-button"
            disabled={!canConfirm}
            onClick={handleReset}
          >
            <Trash2 size={18} aria-hidden="true" />
            {secondsLeft > 0
              ? `${t.actions.delete} (${secondsLeft})`
              : busy
                ? t.actions.deleting
                : t.actions.delete}
          </button>
        </div>
      }
    >
      <div className="factory-reset-content">
        <div className="factory-reset-warning">
          <AlertTriangle size={28} aria-hidden="true" />
          <div>
            <strong>{t.warning.title}</strong>
            <p>{t.warning.text}</p>
          </div>
        </div>

        <div className="factory-reset-preserved">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <strong>{t.preserved.title}</strong>
            <p>{t.preserved.text}</p>
          </div>
        </div>

        {errorKey && (
          <div className="factory-reset-error">{t.errors[errorKey]}</div>
        )}

        <div className="factory-reset-selection">
          <label className="factory-reset-select-all">
            <input
              type="checkbox"
              checked={deleteAll}
              disabled={busy}
              onChange={toggleDeleteAll}
            />
            <span>
              <strong>{t.deleteAll.title}</strong>
              <small>{t.deleteAll.description}</small>
            </span>
          </label>

          <div className="factory-reset-option-grid">
            {RESET_KEYS.map((key) => (
              <label key={key} className="factory-reset-option">
                <input
                  type="checkbox"
                  checked={selection[key]}
                  disabled={busy || (key === "players" && selection.cycles)}
                  onChange={() => toggle(key)}
                />
                <span>
                  <strong>{t.options[key].title}</strong>
                  <small>{t.options[key].description}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="factory-reset-preview">
          <h3>{t.preview.title}</h3>
          {loadingPreview ? (
            <p>{t.preview.loading}</p>
          ) : (
            <div className="factory-reset-preview-grid">
              <span>{t.preview.players}: <strong>{formatCount(preview?.registrations)}</strong></span>
              <span>{t.preview.periods}: <strong>{formatCount(preview?.periods)}</strong></span>
              <span>{t.preview.stats}: <strong>{formatCount(preview?.stats)}</strong></span>
              <span>{t.preview.alliances}: <strong>{formatCount(preview?.alliances)}</strong></span>
              <span>{t.preview.requests}: <strong>{formatCount(preview?.accessRequests)}</strong></span>
            </div>
          )}
        </div>

        <label className="factory-reset-backup-option">
          <input
            type="checkbox"
            checked={downloadBackup}
            disabled={busy}
            onChange={(event) => setDownloadBackup(event.target.checked)}
          />
          <span>
            <strong>{t.backupBeforeReset.title}</strong>
            <small>{t.backupBeforeReset.description}</small>
          </span>
        </label>

        <label className="factory-reset-confirmation">
          <span>{t.confirmation.label}</span>
          <code>{confirmationPhrase}</code>
          <input
            value={confirmation}
            disabled={busy}
            autoComplete="off"
            spellCheck="false"
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={confirmationPhrase}
          />
          <small>{t.confirmation.help}</small>
        </label>
      </div>
    </Modal>
  );
}

export default FactoryResetModal;
