import TurnstileWidget from "../../../components/Turnstile/TurnstileWidget.jsx";
import { turnstileEnabled } from "../../../components/Turnstile/turnstileConfig.js";

export default function LoginSharedForm({
  copy,
  sharedPassword,
  setSharedPassword,
  showSharedPassword,
  setShowSharedPassword,
  error,
  loading,
  challengeToken,
  setChallengeToken,
  challengeNonce,
  onSharedLogin,
}) {
  return (
    <>
      <h1>{copy.sharedConsul.title}</h1>
      <p className="login-card__text">{copy.sharedConsul.description}</p>
      <form className="login-form" onSubmit={onSharedLogin}>
        <label className="login-field"><span>{copy.sharedConsul.password}</span>
          <div className="login-shared-input">
            <input className="login-select" type={showSharedPassword ? "text" : "password"} value={sharedPassword} onChange={event=>setSharedPassword(event.target.value)} autoComplete="off" required />
            <button type="button" className="login-password-toggle" onClick={() => setShowSharedPassword(value => !value)} aria-label={showSharedPassword ? copy.sharedConsul.hidePassword : copy.sharedConsul.showPassword}>
              {showSharedPassword ? copy.sharedConsul.hidePassword : copy.sharedConsul.showPassword}
            </button>
          </div>
        </label>
        {turnstileEnabled && (
          <div className="login-field">
            <TurnstileWidget key={challengeNonce} onTokenChange={setChallengeToken} />
          </div>
        )}
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-submit" disabled={loading || (turnstileEnabled && !challengeToken)}>{copy.sharedConsul.submit}</button>
      </form>
    </>
  );
}
