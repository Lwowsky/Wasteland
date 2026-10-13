import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import Modal from "../Modal/Modal.jsx";
import useCountdown from "../../hooks/useCountdown.js";

import "./ConfirmModal.css";

const ICONS = {
  danger: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  closeLabel,
  tone = "warning",
  className = "",
  countdownSeconds = 0,
  iconSrc,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const secondsLeft = useCountdown({
    active: open,
    seconds: countdownSeconds,
    resetKey: `${title || ""}|${message || ""}`,
  });

  const Icon = ICONS[tone] || AlertTriangle;
  const blocked = busy || secondsLeft > 0;
  const renderedConfirmLabel =
    secondsLeft > 0 ? `${confirmLabel} (${secondsLeft})` : confirmLabel;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      width="560px"
      className={`confirm-modal confirm-modal--${tone} ${className}`.trim()}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      closeLabel={closeLabel || cancelLabel}
      footer={
        <div className="confirm-modal__footer">
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--confirm"
            onClick={onConfirm}
            disabled={blocked}
          >
            {renderedConfirmLabel}
          </button>
        </div>
      }
    >
      <div className="confirm-modal__content">
        <div className="confirm-modal__icon" aria-hidden="true">
          {iconSrc ? <img className="confirm-modal__image" src={iconSrc} alt="" /> : <Icon size={26} />}
        </div>
        <p>{message}</p>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
