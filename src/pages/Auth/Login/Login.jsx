import { signInSharedConsul } from "../../../features/auth/sharedConsulClient.js";
import { turnstileEnabled } from "../../../components/Turnstile/turnstileConfig.js";
import { useEffect, useState } from "react";
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

import LoginIcon from "./LoginIcon.jsx";
import LoginEmailForm from "./LoginEmailForm.jsx";
import LoginSharedForm from "./LoginSharedForm.jsx";
import LoginRequestForm from "./LoginRequestForm.jsx";
import LoginSharedSuccessModal from "./LoginSharedSuccessModal.jsx";

import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { lang } = useParams();
  const { t } = useOutletContext();
  const copy = t.auth;

  const [activeTab, setActiveTab] = useState("login");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [sharedPassword, setSharedPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeNonce, setChallengeNonce] = useState(0);
  const [displayName, setDisplayName] = useState("");

  const [requestedRole, setRequestedRole] = useState("consul");

  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(false);

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");
  const [sharedResult, setSharedResult] = useState(null);
  const [showSharedPassword, setShowSharedPassword] = useState(false);

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
    setSharedResult(null);
  }

  async function handleSharedLogin(event) {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      if (turnstileEnabled && !challengeToken) {
        setError(copy.sharedConsul.challengeRequired);
        return;
      }
      const result = await signInSharedConsul(sharedPassword.trim(), challengeToken);
      setSharedPassword("");
      setSharedResult(result);
    } catch (error) {
      setError(error?.message === "RATE_LIMITED"
        ? copy.sharedConsul.rateLimited
        : ["CHALLENGE_FAILED", "CHALLENGE_REQUIRED", "CHALLENGE_UNAVAILABLE"].includes(error?.message)
          ? copy.sharedConsul.challengeRequired
          : copy.sharedConsul.error);
    } finally {
      setLoading(false);
      setChallengeToken("");
      setChallengeNonce((number) => number + 1);
    }
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
          <LoginIcon name={activeTab === "login" ? "login" : activeTab === "request" ? "request" : "shared"} size="hero" />
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
          <button type="button" className={activeTab === "shared" ? "login-tab login-tab--active" : "login-tab"} onClick={() => changeTab("shared")}>
            {copy.sharedConsul.tab}
          </button>
        </div>

        {activeTab === "login" && (
          <LoginEmailForm
            copy={copy}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
            loading={loading}
            onEmailLogin={handleEmailLogin}
            onGoogleLogin={handleGoogleLogin}
            onRequestTab={() => changeTab("request")}
          />
        )}

        {activeTab === "shared" && (
          <LoginSharedForm
            copy={copy}
            sharedPassword={sharedPassword}
            setSharedPassword={setSharedPassword}
            showSharedPassword={showSharedPassword}
            setShowSharedPassword={setShowSharedPassword}
            error={error}
            loading={loading}
            challengeToken={challengeToken}
            setChallengeToken={setChallengeToken}
            challengeNonce={challengeNonce}
            onSharedLogin={handleSharedLogin}
          />
        )}

        {activeTab === "request" && (
          <LoginRequestForm
            copy={copy}
            displayName={displayName}
            setDisplayName={setDisplayName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            requestedRole={requestedRole}
            setRequestedRole={setRequestedRole}
            comment={comment}
            setComment={setComment}
            error={error}
            success={success}
            loading={loading}
            onEmailRequest={handleEmailRequest}
            onGoogleRequest={handleGoogleRequest}
          />
        )}
      </div>
      {sharedResult && (
        <LoginSharedSuccessModal
          copy={copy}
          sharedResult={sharedResult}
          language={lang}
          onContinue={() => {
            setSharedResult(null);
            navigate(redirectPath, { replace: true });
          }}
        />
      )}
    </main>
  );
}

export default Login;
