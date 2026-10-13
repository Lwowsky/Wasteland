import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import "./Modal.css";

let bodyLockCount = 0;
let bodyOverflowBeforeLock = "";

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);

  if (bodyLockCount === 0) {
    document.body.style.overflow = bodyOverflowBeforeLock;
    bodyOverflowBeforeLock = "";
  }
}

function Modal({
  open,
  onClose,

  title,
  subtitle,

  headerContent,

  children,

  footer,

  width = "1180px",

  className = "",
  backdropClassName = "",

  closeOnBackdrop = true,
  closeOnEscape = true,

  showClose = true,

  closeLabel,

  ariaLabel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (closeOnEscape && onClose && event.key === "Escape") {
        onClose();
      }
    }

    lockBodyScroll();
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) {
    return null;
  }

  function handleBackdropMouseDown(event) {
    if (!closeOnBackdrop || !onClose) {
      return;
    }

    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const canShowCloseButton = showClose && onClose && closeLabel;

  return createPortal(
    <div
      className={`site-modal-backdrop ${backdropClassName}`.trim()}
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <section
        className={`site-modal ${className}`}
        style={{
          "--site-modal-width": width,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
      >
        {(title || subtitle || headerContent || canShowCloseButton) && (
          <header className="site-modal__header">
            <div className="site-modal__header-content">
              {headerContent ? (
                headerContent
              ) : (
                <>
                  {title && <h2 className="site-modal__title">{title}</h2>}

                  {subtitle && (
                    <p className="site-modal__subtitle">{subtitle}</p>
                  )}
                </>
              )}
            </div>

            {canShowCloseButton && (
              <button
                type="button"
                className="site-modal__close"
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
              >
                <X size={24} aria-hidden="true" />
              </button>
            )}
          </header>
        )}

        <div className="site-modal__body">{children}</div>

        {footer && <footer className="site-modal__footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

export default Modal;
