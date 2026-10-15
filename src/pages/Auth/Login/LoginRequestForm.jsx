import LoginIcon from "./LoginIcon.jsx";
import LoginCredentialsFields from "./LoginCredentialsFields.jsx";

const REQUEST_ROLES = ["consul", "admin"];

export default function LoginRequestForm({
  copy,
  displayName,
  setDisplayName,
  email,
  setEmail,
  password,
  setPassword,
  requestedRole,
  setRequestedRole,
  comment,
  setComment,
  error,
  success,
  loading,
  onEmailRequest,
  onGoogleRequest,
}) {
  return (
    <>
      <h1>{copy.request.title}</h1>

      <p className="login-card__text">{copy.request.text}</p>

      <form className="login-form" onSubmit={onEmailRequest}>
        <label className="login-field">
          <span>{copy.request.name}</span>

          <div className="login-field__control">
            <LoginIcon name="user" />

            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={copy.request.namePlaceholder}
              required
            />
          </div>
        </label>

        <LoginCredentialsFields
          copy={copy}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          passwordPlaceholder={copy.request.passwordPlaceholder}
          passwordMinLength={6}
        />

        <label className="login-field">
          <span>{copy.request.role}</span>

          <select
            className="login-select"
            value={requestedRole}
            onChange={(event) => setRequestedRole(event.target.value)}
          >
            {REQUEST_ROLES.map((role) => (
              <option key={role} value={role}>
                {copy.request.roles[role]}
              </option>
            ))}
          </select>
        </label>

        <label className="login-field">
          <span>{copy.request.comment}</span>

          <textarea
            className="login-textarea"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={copy.request.commentPlaceholder}
            rows={3}
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        {success && (
          <div className="login-success">
            <LoginIcon name="success" />

            <span>{success}</span>
          </div>
        )}

        <button type="submit" className="login-submit" disabled={loading}>
          <LoginIcon name="request" />

          {loading ? copy.request.sending : copy.request.submit}
        </button>
      </form>

      <div className="login-divider">
        <span>{copy.login.or}</span>
      </div>

      <button
        type="button"
        className="login-google"
        onClick={onGoogleRequest}
        disabled={loading}
      >
        <span className="login-google__mark">G</span>
        {copy.request.googleSubmit}
      </button>
    </>
  );
}
