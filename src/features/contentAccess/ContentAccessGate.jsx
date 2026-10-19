import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import AccessStatusCard from "../../components/AccessStatusCard/AccessStatusCard.jsx";
import RouteLoading from "../../components/RouteLoading/RouteLoading.jsx";
import {
  activateContentAccess,
  clearContentAccessSession,
  getContentAccessStatus,
  getPublicContentAccessHint,
  getContentAccessSession,
} from "./contentAccessApi.js";

import { ContentAccessContext } from "./ContentAccessContext.js";
import { getPublicCycleViewState } from "../../../shared/registrationCycle.js";
import useNow from "../../hooks/useNow.js";
import { publicAsset } from "../../utils/publicAsset.js";
import { getClosedCycleCopy } from "./closedCycleCopy.js";
import { getNextRegistrationOpening } from "./nextRegistrationOpening.js";

import "./ContentAccessGate.css";


// Use the site's existing square, transparent artwork, never a wide navigation banner.
function getAccessIcon(resource) {
  return publicAsset(resource === "players"
    ? "/images/admin/region-editor/player.webp"
    : "/images/admin/icons/final-plan.webp");
}

function getAccessCopy(copy, resource, status) {
  if (status?.reason === "SNAPSHOT_CYCLE_MISMATCH") {
    return {
      title: copy.cycleUpdating.title,
      text: copy.cycleUpdating[resource] || copy.cycleUpdating.text,
    };
  }

  const mode = status?.mode || "private";
  return copy.modes[mode] || copy.modes.private;
}


const CODE_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
function getCodeAttemptState(resource) {
  try {
    const key = `wasteland-invalid-code-v1:${resource}`;
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    const now = Date.now();
    const times = (Array.isArray(saved) ? saved : []).filter((t) => Number.isFinite(t) && t <= now && now - t < CODE_ATTEMPT_WINDOW_MS);
    if (times.length !== (Array.isArray(saved) ? saved.length : 0)) localStorage.setItem(key, JSON.stringify(times));
    return { blocked: times.length >= 3, count: times.length };
  } catch { return { blocked: false, count: 0 }; }
}
function recordInvalidCodeAttempt(resource) {
  try {
    const key = `wasteland-invalid-code-v1:${resource}`;
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const now = Date.now();
    const times = (Array.isArray(saved) ? saved : []).filter((t) => Number.isFinite(t) && now - t < CODE_ATTEMPT_WINDOW_MS);
    times.push(now);
    localStorage.setItem(key, JSON.stringify(times));
  } catch { /* Client-side throttle is best-effort. */ }
}

function getErrorCode(error) {
  return String(error?.message || "");
}

function ContentAccessGate({ resource, children }) {
  const { t, language, useLocalTime, registrationConfig, eventError } = useOutletContext();
  const now = useNow(60_000);
  const settingsLoaded = Boolean(registrationConfig?.settings);
  const cycleState = settingsLoaded
    ? getPublicCycleViewState(registrationConfig.settings, now)
    : null;
  const cycleClosed = cycleState?.state === "closed";
  const cycleEpoch = cycleState?.eventStartAt || (settingsLoaded ? "manual" : "");
  const location = useLocation();
  const navigate = useNavigate();
  const copy = t.contentAccess;

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [code, setCode] = useState("");
  const [attemptsVersion, setAttemptsVersion] = useState(0);
  const [errorCode, setErrorCode] = useState("");
  const skipNextSessionLoadRef = useRef("");
  const activationInFlightRef = useRef(false);

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

    if (cycleClosed || !settingsLoaded) {
      if (cycleClosed && sharedToken) removeSharedTokenFromUrl();
      // A stale public snapshot must not authorize a closed cycle. Do not
      // fetch /decrypt it or create sessions while the calendar is closed.
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorCode("");

      let shouldRemoveSharedToken = false;
      let activatedSession = null;

      try {
        if (sharedToken) {
          try {
            const staticStatus = /^[a-zA-Z0-9_-]{16}$/.test(sharedToken)
              ? await getPublicContentAccessHint(resource, sharedToken, cycleEpoch === "manual" ? "" : cycleEpoch)
              : null;
            if (staticStatus) {
              if (!staticStatus.allowed) {
                setStatus({ ...staticStatus, cycleEpoch });
                setLoading(false);
                return;
              }
              if (!cancelled) {
                setStatus({ ...staticStatus, cycleEpoch });
                setLoading(false);
                // Prevent sharing the raw capability via browser history/referrers.
                skipNextSessionLoadRef.current = resource;
                removeSharedTokenFromUrl();
              }
              return;
            }
            activatedSession = await activateContentAccess(resource, sharedToken);
            shouldRemoveSharedToken = true;
          } catch (activationError) {
            clearContentAccessSession(resource);

            if (!cancelled) {
              setErrorCode(getErrorCode(activationError));
            }
          }
        }

        // Successful activation already validates the code and creates a
        // server-side session. Avoid a redundant second Worker request.
        // Ordinary page loads still validate permissions with the server.
        const nextStatus = activatedSession
          ? {
              resource,
              mode: "link",
              allowed: true,
              period: activatedSession.period,
            }
          : (!getContentAccessSession(resource)
              ? (await getPublicContentAccessHint(resource, "", cycleEpoch === "manual" ? "" : cycleEpoch)) || await getContentAccessStatus(resource)
              : await getContentAccessStatus(resource));

        if (cancelled) {
          return;
        }

        setStatus({ ...nextStatus, cycleEpoch });
        setLoading(false);

        if (shouldRemoveSharedToken) {
          skipNextSessionLoadRef.current = resource;
          removeSharedTokenFromUrl();
        }
      } catch (nextError) {
        clearContentAccessSession(resource);

        if (!cancelled) {
          setStatus({ resource, mode: "private", allowed: false, cycleEpoch });
          setErrorCode(getErrorCode(nextError));
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [resource, sharedToken, cycleClosed, settingsLoaded, cycleEpoch]);

  async function submitCode(event) {
    event.preventDefault();

    if (!code.trim() || activating || activationInFlightRef.current || getCodeAttemptState(resource).blocked) {
      return;
    }

    activationInFlightRef.current = true;
    setActivating(true);
    setErrorCode("");

    try {
      const activated = await activateContentAccess(resource, code);
      // The activation response is proof of the newly issued server session.
      // Protected API endpoints independently enforce that session.
      setStatus({ resource, mode: "code", allowed: true, period: activated.period, cycleEpoch });
      setCode("");
    } catch (nextError) {
      clearContentAccessSession(resource);
      if (getErrorCode(nextError) === "CONTENT_TOKEN_INVALID") {
        recordInvalidCodeAttempt(resource);
        setAttemptsVersion((value) => value + 1);
      }
      setErrorCode(getErrorCode(nextError));
    } finally {
      activationInFlightRef.current = false;
      setActivating(false);
    }
  }

  const currentStatus = status?.resource === resource && status.cycleEpoch === cycleEpoch ? status : null;
  // Recomputed after an invalid attempt; the browser also persists attempts across F5.
  void attemptsVersion;
  const codeAttemptState = getCodeAttemptState(resource);

  // Keep already-authorized content mounted during any background re-check.
  // On the first check, show only the neutral route spinner so the private
  // access card never flashes for a public/authorized page during refresh.
  if (cycleClosed) {
    const closed = getClosedCycleCopy({
      copy,
      resource,
      nextOpensAt: getNextRegistrationOpening(registrationConfig.settings, now),
      nowMs: now,
      language,
      useLocalTime,
    });
    return (
      <Page containerClassName="content-access-container">
        <div className="content-access-page">
          <AccessStatusCard
            iconSrc={getAccessIcon(resource)}
            title={copy.resources[resource] || resource}
            heading={closed.title}
            text={closed.text}
          >
            {closed.countdown && <p className="content-access-countdown">{closed.countdown}</p>}
          </AccessStatusCard>
        </div>
      </Page>
    );
  }

  if (!settingsLoaded) {
    if (!eventError) return <RouteLoading />;
    return (
      <Page containerClassName="content-access-container">
        <div className="content-access-page">
          <AccessStatusCard
            iconSrc={getAccessIcon(resource)}
            title={copy.resources[resource] || resource}
            text={copy.cycleUnavailable}
          />
        </div>
      </Page>
    );
  }

  if (status?.cycleEpoch !== cycleEpoch && cycleEpoch) return <RouteLoading />;

  if (currentStatus?.allowed) {
    return <ContentAccessContext.Provider value={currentStatus}>{children}</ContentAccessContext.Provider>;
  }

  if (loading) {
    return <RouteLoading />;
  }

  const mode = currentStatus?.mode || "private";
  const resourceLabel = copy.resources[resource] || resource;
  const errorText = !codeAttemptState.blocked && errorCode
    ? copy.errors[errorCode] || copy.errors.default
    : "";

  return (
    <Page containerClassName="content-access-container">
      <div className="content-access-page">
        <AccessStatusCard
          iconSrc={getAccessIcon(resource)}
          title={resourceLabel}
          heading={getAccessCopy(copy, resource, currentStatus).title}
          text={getAccessCopy(copy, resource, currentStatus).text}
        >
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

              <button type="submit" disabled={!code.trim() || activating || codeAttemptState.blocked}>
                <><img className="content-access-button-icon" src={getAccessIcon(resource)} alt="" width="18" height="18" />{activating ? copy.code.activating : copy.code.submit}</>
              </button>
            </form>
          )}

          {mode === "code" && codeAttemptState.blocked && (
            <div className="content-access-error" role="alert">
              {copy.errors.CONTENT_CODE_RATE_LIMITED}
            </div>
          )}
          {errorText && (
            <div className="content-access-error">{errorText}</div>
          )}
        </AccessStatusCard>
      </div>
    </Page>
  );
}

export default ContentAccessGate;
