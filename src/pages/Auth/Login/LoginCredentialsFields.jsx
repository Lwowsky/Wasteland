import LoginIcon from "./LoginIcon.jsx";

/** Shared email/password fields used by both login and access requests. */
export default function LoginCredentialsFields({
  copy,
  email,
  setEmail,
  password,
  setPassword,
  passwordPlaceholder,
  passwordMinLength,
}) {
  return (
    <>
      <label className="login-field">
        <span>{copy.login.email}</span>
        <div className="login-field__control">
          <LoginIcon name="email" />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.login.emailPlaceholder}
            required
          />
        </div>
      </label>
      <label className="login-field">
        <span>{copy.login.password}</span>
        <div className="login-field__control">
          <LoginIcon name="login" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={passwordPlaceholder}
            minLength={passwordMinLength}
            required
          />
        </div>
      </label>
    </>
  );
}
