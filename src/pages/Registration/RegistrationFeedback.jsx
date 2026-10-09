import { AlertCircle, CheckCircle2 } from "lucide-react";
import "./RegistrationFeedback.css";

function RegistrationFeedback({
  t,
  success,
  errorMessage,
  feedbackRef,
}) {
  if (success) {
    return (
      <div
        ref={feedbackRef}
        className="registration-success registration-success--success"
      >
        <div className="registration-success__icon">
          <CheckCircle2 size={24} aria-hidden="true" />
        </div>
        <div>
          <strong>{t.registration.success.title}</strong>
          <p>{t.registration.success.text}</p>
        </div>
      </div>
    );
  }

  if (!errorMessage) {
    return null;
  }

  return (
    <div
      ref={feedbackRef}
      className="registration-success registration-success--error"
      role="alert"
    >
      <div className="registration-success__icon">
        <AlertCircle size={24} aria-hidden="true" />
      </div>
      <div>
        <strong>{t.registration.errorTitle}</strong>
        <p>{errorMessage}</p>
      </div>
    </div>
  );
}

export default RegistrationFeedback;
