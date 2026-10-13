import { KeyRound, Link2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import RouteLoading from "../../components/RouteLoading/RouteLoading.jsx";
import {
  activateContentAccess,
  clearContentAccessSession,
  getContentAccessStatus,
} from "./contentAccessApi.js";

import "./ContentAccessGate.css";

function getErrorCode(error) {
  return String(error?.message || "");
}

function ContentAccessGate({ resource, children }) {
  const { t } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const copy = t.contentAccess;

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [code, setCode] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const skipNextSessionLoadRef = useRef("");

  const sharedToken = new URLSearchParams(location.search).get("access") || "";

  const removeSharedTokenFromUrl = useEffectEvent(() => {
    const params = new URLSearchParams(location.search);
    params.delete("access");
    const search = params.toString();

    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : "",
        hash: location.hash,
      },
      { replace: true },
    );
  });

  useEffect(() => {
    if (!sharedToken && skipNextSessionLoadRef.current === resource) {
      skipNextSessionLoadRef.current = "";
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorCode("");

      let shouldRemoveSharedToken = false;

      try {
        if (sharedToken) {
          try {
            await activateContentAccess(resource, sharedToken);
            shouldRemoveSharedToken = true;
          } catch (activationError) {
            clearContentAccessSession(resource);

            if (!cancelled) {
              setErrorCode(getErrorCode(activationError));
            }
          }
        }

        const nextStatus = await getContentAccessStatus(resource);

        if (cancelled) {
          return;
        }

        setStatus(nextStatus);
        setLoading(false);

        if (shouldRemoveSharedToken) {
          skipNextSessionLoadRef.current = resource;
          removeSharedTokenFromUrl();
        }
      } catch (nextError) {
        clearContentAccessSession(resource);

        if (!cancelled) {
          setStatus({ resource, mode: "private", allowed: false });
          setErrorCode(getErrorCode(nextError));
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [resource, sharedToken]);

  async function submitCode(event) {
    event.preventDefault();

    if (!code.trim() || activating) {
      return;
    }

    setActivating(true);
    setErrorCode("");

    try {
      await activateContentAccess(resource, code);
      const nextStatus = await getContentAccessStatus(resource);
      setStatus(nextStatus);
      setCode("");
    } catch (nextError) {
      clearContentAccessSession(resource);
      setErrorCode(getErrorCode(nextError));
    } finally {
      setActivating(false);
    }
  }

  const currentStatus = status?.resource === resource ? status : null;

  // Keep already-authorized content mounted during any background re-check.
  // On the first check, show only the neutral route spinner so the private
  // access card never flashes for a public/authorized page during refresh.
  if (currentStatus?.allowed) {
    return children;
  }

  if (loading) {
    return <RouteLoading />;
  }

  const mode = currentStatus?.mode || "private";
  const resourceLabel = copy.resources[resource] || resource;
  const errorText = errorCode
    ? copy.errors[errorCode] || copy.errors.default
    : "";

  return (
    <Page containerClassName="content-access-container">
      <div className="content-access-page">
        <PagePanel className="content-access-panel">
          <div className="content-access-icon" aria-hidden="true">
            {mode === "code" ? (
              <KeyRound size={32} />
            ) : mode === "link" ? (
              <Link2 size={32} />
            ) : mode === "public" ? (
              <ShieldCheck size={32} />
            ) : (
              <LockKeyhole size={32} />
            )}
          </div>

          <h1>{resourceLabel}</h1>

          <h2>{copy.modes[mode].title}</h2>
          <p>{copy.modes[mode].text}</p>

          {mode === "code" && (
            <form className="content-access-form" onSubmit={submitCode}>
              <label>
                <span>{copy.code.label}</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={copy.code.placeholder}
                  autoComplete="one-time-code"
                />
              </label>

              <button type="submit" disabled={!code.trim() || activating}>
                <KeyRound size={18} aria-hidden="true" />
                {activating ? copy.code.activating : copy.code.submit}
              </button>
            </form>
          )}

          {errorText && (
            <div className="content-access-error">{errorText}</div>
          )}
        </PagePanel>
      </div>
    </Page>
  );
}

export default ContentAccessGate;
