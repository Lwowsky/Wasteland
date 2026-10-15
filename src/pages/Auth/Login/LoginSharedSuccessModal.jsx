import LoginIcon from "./LoginIcon.jsx";

function formatLoginDate(timestamp, language) {
  return new Intl.DateTimeFormat(language === "uk" ? "uk-UA" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

export default function LoginSharedSuccessModal({ copy, sharedResult, language, onContinue }) {
  return (
    <div className="login-modal-backdrop" role="presentation">
      <section className="login-success-modal" role="dialog" aria-modal="true" aria-labelledby="login-shared-success-title">
        <LoginIcon name="success" size="hero" />
        <h2 id="login-shared-success-title">{copy.sharedConsul.successTitle}</h2>
        <p>{copy.sharedConsul.successText}</p>
        <div className="login-success-modal__details">
          <div><strong>{copy.sharedConsul.passwordExpiry}</strong><span>{sharedResult.credentialExpiresAt == null ? copy.sharedConsul.unlimited : formatLoginDate(sharedResult.credentialExpiresAt, language)}</span></div>
          <div><strong>{copy.sharedConsul.sessionExpiry}</strong><span>{formatLoginDate(sharedResult.expiresAt, language)}</span></div>
        </div>
        <p className="login-success-modal__hint">{copy.sharedConsul.sessionHint}</p>
        <button type="button" className="login-submit" onClick={onContinue}>
          {copy.sharedConsul.continue}
        </button>
      </section>
    </div>

  );
}
