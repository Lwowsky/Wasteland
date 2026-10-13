import {
  AlertTriangle,
  Database,
  LockKeyhole,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import useCountdown from "../../../hooks/useCountdown.js";

const REPLACE_COUNTDOWN_SECONDS = 10;

function TransferLocalPlayersModal({
  open,
  onClose,
  t,
  rows,
  existingPlayers,
  allowReplaceAll = false,
  busy = false,
  onConfirm,
}) {
  const [mode, setMode] = useState("skipExisting");

  const isReplaceMode =
    mode === "replacePeriod" || mode === "replacePeriodAndClose";
  const secondsLeft = useCountdown({
    active: open && isReplaceMode,
    seconds: REPLACE_COUNTDOWN_SECONDS,
    resetKey: mode,
  });

  const summary = useMemo(() => {
    const existingNames = new Set(
      existingPlayers
        .map((player) => String(player.nickname || "").trim().toLocaleLowerCase())
        .filter(Boolean),
    );

    let duplicates = 0;
    let newPlayers = 0;

    for (const row of rows) {
      const key = String(row.player?.nickname || "").trim().toLocaleLowerCase();
      if (key && existingNames.has(key)) duplicates += 1;
      else newPlayers += 1;
    }

    return {
      total: rows.length,
      duplicates,
      newPlayers,
      existingTotal: existingPlayers.length,
    };
  }, [rows, existingPlayers]);

  const canConfirm =
    !busy &&
    rows.length > 0 &&
    (!isReplaceMode || (allowReplaceAll && secondsLeft === 0));

  function chooseMode(nextMode) {
    const nextIsReplace =
      nextMode === "replacePeriod" || nextMode === "replacePeriodAndClose";

    if (nextIsReplace && !allowReplaceAll) return;

    setMode(nextMode);
  }

  function getPrimaryLabel() {
    if (busy) return t.processing;

    if (mode === "replacePeriod") {
      return secondsLeft > 0
        ? `${t.replaceButton} (${secondsLeft})`
        : t.replaceButton;
    }

    if (mode === "replacePeriodAndClose") {
      return secondsLeft > 0
        ? `${t.replaceAndCloseButton} (${secondsLeft})`
        : t.replaceAndCloseButton;
    }

    return t.addButton.replace("{{count}}", String(summary.newPlayers));
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      width="780px"
      title={t.title}
      subtitle={t.subtitle}
      closeLabel={t.cancel}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      className="local-transfer-modal"
      footer={
        <div className="local-transfer-modal__footer">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            {t.cancel}
          </button>

          <button
            type="button"
            className={`admin-primary-button ${isReplaceMode ? "is-danger" : ""}`}
            disabled={!canConfirm}
            onClick={() => onConfirm(mode)}
          >
            {mode === "replacePeriodAndClose" ? (
              <LockKeyhole size={17} aria-hidden="true" />
            ) : mode === "replacePeriod" ? (
              <RefreshCw size={17} aria-hidden="true" />
            ) : (
              <UserPlus size={17} aria-hidden="true" />
            )}
            {getPrimaryLabel()}
          </button>
        </div>
      }
    >
      <div className="local-transfer-modal__content">
        <div className="local-transfer-modal__summary">
          <span>
            {t.selected}: <strong>{summary.total}</strong>
          </span>
          <span>
            {t.newPlayers}: <strong>{summary.newPlayers}</strong>
          </span>
          <span>
            {t.duplicates}: <strong>{summary.duplicates}</strong>
          </span>
          <span>
            {t.databaseNow}: <strong>{summary.existingTotal}</strong>
          </span>
        </div>

        <button
          type="button"
          className={`local-transfer-option ${mode === "skipExisting" ? "is-active" : ""}`}
          onClick={() => chooseMode("skipExisting")}
        >
          <span className="local-transfer-option__icon is-safe">
            <Database size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>{t.addMissing.title}</strong>
            <small>{t.addMissing.description}</small>
          </span>
        </button>

        <button
          type="button"
          className={`local-transfer-option local-transfer-option--danger ${mode === "replacePeriod" ? "is-active" : ""}`}
          onClick={() => chooseMode("replacePeriod")}
          disabled={!allowReplaceAll}
        >
          <span className="local-transfer-option__icon is-danger">
            <RefreshCw size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>{t.replaceAll.title}</strong>
            <small>
              {allowReplaceAll
                ? t.replaceAll.description
                : t.replaceAll.onlyAllRows}
            </small>
          </span>
        </button>

        <button
          type="button"
          className={`local-transfer-option local-transfer-option--danger ${mode === "replacePeriodAndClose" ? "is-active" : ""}`}
          onClick={() => chooseMode("replacePeriodAndClose")}
          disabled={!allowReplaceAll}
        >
          <span className="local-transfer-option__icon is-danger">
            <LockKeyhole size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>{t.replaceAndClose.title}</strong>
            <small>
              {allowReplaceAll
                ? t.replaceAndClose.description
                : t.replaceAll.onlyAllRows}
            </small>
          </span>
        </button>

        {isReplaceMode && allowReplaceAll && (
          <div className="local-transfer-modal__warning">
            <AlertTriangle size={20} aria-hidden="true" />
            <span>
              {mode === "replacePeriodAndClose"
                ? t.replaceAndCloseWarning
                : t.replaceWarning}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default TransferLocalPlayersModal;
