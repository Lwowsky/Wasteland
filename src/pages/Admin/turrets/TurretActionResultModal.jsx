import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import Modal from "../../../components/Modal/Modal.jsx";

import "./TurretActionResultModal.css";

const TONES = {
  success: { image: "/images/admin/icons/actions/approve.webp", label: "successTitle" },
  info: { image: "/images/admin/icons/actions/no-changes-info.webp", label: "infoTitle" },
  error: { image: "/images/admin/icons/actions/reject.webp", label: "errorTitle" },
};

// Action results are intentionally persistent until the user acknowledges them.
// They describe a completed action, never a confirmation before changing data.
export default function TurretActionResultModal({ notice, onDismiss, labels }) {
  const buttonRef = useRef(null);
  const isOpen = Boolean(notice?.text);
  const dismiss = () => {
    if (notice) onDismiss(notice.id);
  };

  useEffect(() => {
    if (isOpen) buttonRef.current?.focus();
  }, [isOpen, notice?.id]);

  const tone = TONES[notice?.tone] ? notice.tone : "info";
  const { image, label } = TONES[tone];

  return <Modal
    open={isOpen}
    onClose={dismiss}
    title={notice?.title || labels.actionTitle}
    width="480px"
    className={`turret-action-result-modal turret-action-result-modal--${tone}`}
    backdropClassName="turret-action-result-backdrop"
    closeOnBackdrop={false}
    closeLabel={labels.dismiss}
    footer={<button ref={buttonRef} className="turret-action-result__acknowledge"
      type="button" onClick={dismiss}>
      <Check size={18} aria-hidden="true" />{labels.acknowledge}
    </button>}
  >
    <div className="turret-action-result__content">
      <div className="turret-action-result__icon" aria-hidden="true">
        <img className="turret-action-result__image" src={image} alt="" />
      </div>
      <div className="turret-action-result__details">
        <span className="turret-action-result__status">{labels[label]}</span>
        <p role={tone === "error" ? "alert" : "status"}>{notice?.text}</p>
      </div>
    </div>
  </Modal>;
}
