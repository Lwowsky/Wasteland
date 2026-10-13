import Modal from "../../../components/Modal/Modal.jsx";
import useCountdown from "../../../hooks/useCountdown.js";

function RegistrationConfirmModal({
  open,
  onClose,
  title,
  description,
  details = [],
  cancelLabel,
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onPrimary,
  countdownSeconds = 10,
  busy = false,
  iconSrc = "",
}) {
  const secondsLeft = useCountdown({
    active: open,
    seconds: countdownSeconds,
    resetKey: title || primaryLabel || "registration-confirm",
  });

  const primaryDisabled = busy || secondsLeft > 0;
  const resolvedPrimaryLabel =
    secondsLeft > 0 ? `${primaryLabel} (${secondsLeft})` : primaryLabel;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      width="680px"
      title={title}
      closeLabel={cancelLabel}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      footer={
        <div className="registration-modal-footer">
          <button
            type="button"
            className="registration-secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>

          {secondaryLabel && onSecondary && (
            <button
              type="button"
              className="registration-secondary-button"
              disabled={busy}
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}

          <button
            type="button"
            className="admin-primary-button registration-confirm-primary"
            disabled={primaryDisabled}
            onClick={onPrimary}
          >
            {resolvedPrimaryLabel}
          </button>
        </div>
      }
    >
      <div className="registration-confirm-content">
        {iconSrc && (
          <div className="registration-confirm-content__icon" aria-hidden="true">
            <img src={iconSrc} alt="" />
          </div>
        )}

        <div>
          <p className="registration-confirm-content__description">
            {description}
          </p>

          {details.length > 0 && (
            <ul className="registration-confirm-content__details">
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default RegistrationConfirmModal;
