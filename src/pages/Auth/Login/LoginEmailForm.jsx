import LoginIcon from "./LoginIcon.jsx";
import LoginCredentialsFields from "./LoginCredentialsFields.jsx";

export default function LoginEmailForm({
  copy,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onEmailLogin,
  onGoogleLogin,
  onRequestTab,
}) {
  return (
    <>
      <h1>{copy.login.title}</h1>

      <p className="login-card__text">{copy.login.text}</p>

      <form className="login-form" onSubmit={onEmailLogin}>
        <LoginCredentialsFields
          copy={copy}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          passwordPlaceholder={copy.login.passwordPlaceholder}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-submit" disabled={loading}>
          <LoginIcon name="login" />

          {loading ? copy.login.signingIn : copy.login.signIn}
        </button>
      </form>

      <div className="login-divider">
        <span>{copy.login.or}</span>
      </div>

      <button
        type="button"
        className="login-google"
        onClick={onGoogleLogin}
        disabled={loading}
      >
        <span className="login-google__mark">G</span>
        {copy.login.googleSignIn}
      </button>

      <button
        type="button"
        className="login-request-link"
        onClick={onRequestTab}
      >
        {copy.login.requestLink}
      </button>
    </>
  );
}
