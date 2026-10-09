import { useEffect, useState } from "react";

import {
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  LogIn,
  Mail,
  User,
} from "lucide-react";

import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { auth } from "../../../config/firebaseAuth.js";

import {
  getAccessRequest,
  submitAccessRequest,
} from "../../../features/auth/accessRequestsService.js";

import "./Login.css";

const REQUEST_ROLES = ["consul", "admin"];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { lang } = useParams();
  const { t } = useOutletContext();
  const copy = t.auth;

  const [activeTab, setActiveTab] = useState("login");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [displayName, setDisplayName] = useState("");

  const [requestedRole, setRequestedRole] = useState("consul");

  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(false);

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const redirectPath = location.state?.from || `/${lang}/admin`;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function changeTab(tab) {
    clearMessages();
    setActiveTab(tab);
  }

  async function handleEmailLogin(event) {
    event.preventDefault();

    setLoading(true);
    clearMessages();

    try {
      await signInWithEmailAndPassword(auth, email, password);

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      console.error("Email login error:", error);

      setError(copy.login.errors.emailLogin);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    clearMessages();

    try {
      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      console.error("Google login error:", error);

      setError(copy.login.errors.googleLogin);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRequest(event) {
    event.preventDefault();

    setLoading(true);
    clearMessages();

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      await updateProfile(credential.user, {
        displayName: displayName.trim(),
      });

      await submitAccessRequest({
        uid: credential.user.uid,
        displayName: displayName.trim(),
        email: credential.user.email,
        requestedRole,
        comment,
      });

      setSuccess(copy.request.messages.sent);
    } catch (error) {
      console.error("Access request error:", error);

      if (error.code === "auth/email-already-in-use") {
        setError(copy.request.errors.emailInUse);
      } else {
        setError(copy.request.errors.submit);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRequest() {
    setLoading(true);
    clearMessages();

    try {
      const provider = new GoogleAuthProvider();

      const credential = await signInWithPopup(auth, provider);

      const user = credential.user;

      const existingRequest = await getAccessRequest(user.email);

      if (existingRequest?.status === "pending") {
        setSuccess(copy.request.messages.pending);

        return;
      }

      setEmail(user.email || "");

      setDisplayName(user.displayName || "");

      await submitAccessRequest({
        uid: user.uid,
        displayName: user.displayName || user.email || user.uid,
        email: user.email || "",
        requestedRole,
        comment,
      });

      setSuccess(copy.request.messages.googleSent);
    } catch (error) {
      console.error("Google request error:", error);

      setError(copy.request.errors.googleSubmit);
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="login-page">
        <div className="login-card">
          <p>{copy.login.checking}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__icon">
          {activeTab === "login" ? (
            <LockKeyhole size={30} />
          ) : (
            <ClipboardList size={30} />
          )}
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={
              activeTab === "login"
                ? "login-tab login-tab--active"
                : "login-tab"
            }
            onClick={() => changeTab("login")}
          >
            {copy.login.tabs.login}
          </button>

          <button
            type="button"
            className={
              activeTab === "request"
                ? "login-tab login-tab--active"
                : "login-tab"
            }
            onClick={() => changeTab("request")}
          >
            {copy.login.tabs.request}
          </button>
        </div>

        {activeTab === "login" && (
          <>
            <h1>{copy.login.title}</h1>

            <p className="login-card__text">{copy.login.text}</p>

            <form className="login-form" onSubmit={handleEmailLogin}>
              <label className="login-field">
                <span>{copy.login.email}</span>

                <div className="login-field__control">
                  <Mail size={18} />

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
                  <LockKeyhole size={18} />

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.login.passwordPlaceholder}
                    required
                  />
                </div>
              </label>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-submit" disabled={loading}>
                <LogIn size={18} />

                {loading ? copy.login.signingIn : copy.login.signIn}
              </button>
            </form>

            <div className="login-divider">
              <span>{copy.login.or}</span>
            </div>

            <button
              type="button"
              className="login-google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="login-google__mark">G</span>
              {copy.login.googleSignIn}
            </button>

            <button
              type="button"
              className="login-request-link"
              onClick={() => changeTab("request")}
            >
              {copy.login.requestLink}
            </button>
          </>
        )}

        {activeTab === "request" && (
          <>
            <h1>{copy.request.title}</h1>

            <p className="login-card__text">{copy.request.text}</p>

            <form className="login-form" onSubmit={handleEmailRequest}>
              <label className="login-field">
                <span>{copy.request.name}</span>

                <div className="login-field__control">
                  <User size={18} />

                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={copy.request.namePlaceholder}
                    required
                  />
                </div>
              </label>

              <label className="login-field">
                <span>{copy.login.email}</span>

                <div className="login-field__control">
                  <Mail size={18} />

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
                  <LockKeyhole size={18} />

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.request.passwordPlaceholder}
                    minLength={6}
                    required
                  />
                </div>
              </label>

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
                  <CheckCircle2 size={18} />

                  <span>{success}</span>
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                <ClipboardList size={18} />

                {loading ? copy.request.sending : copy.request.submit}
              </button>
            </form>

            <div className="login-divider">
              <span>{copy.login.or}</span>
            </div>

            <button
              type="button"
              className="login-google"
              onClick={handleGoogleRequest}
              disabled={loading}
            >
              <span className="login-google__mark">G</span>
              {copy.request.googleSubmit}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default Login;
