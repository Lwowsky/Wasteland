import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

import Page from "../../components/Page/Page.jsx";
import AccessStatusCard from "../../components/AccessStatusCard/AccessStatusCard.jsx";
import RouteLoading from "../../components/RouteLoading/RouteLoading.jsx";
import { getContentAccessStatus, getPublicContentAccessHint } from "./contentAccessApi.js";

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


function ContentAccessGate({ resource, children }) {
  const { t, language, useLocalTime, registrationConfig, eventError } = useOutletContext();
  const now = useNow(60_000);
  const settingsLoaded = Boolean(registrationConfig?.settings);
  const cycleState = settingsLoaded
    ? getPublicCycleViewState(registrationConfig.settings, now)
    : null;
  const cycleClosed = cycleState?.state === "closed";
  const expectedPeriodId = settingsLoaded ? registrationConfig?.period?.id ?? null : undefined;
  const manualCycle = cycleState?.state === "manual";
  const cycleEpoch = cycleState?.eventStartAt || (settingsLoaded ? `manual:${expectedPeriodId ?? "none"}` : "");
  const location = useLocation();
  const navigate = useNavigate();
  const copy = t.contentAccess;

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
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

      try {
        const nextStatus = sharedToken
          ? (/^[a-zA-Z0-9_-]{16}$/.test(sharedToken)
              ? await getPublicContentAccessHint(resource, sharedToken, manualCycle ? "" : cycleEpoch, expectedPeriodId)
              : { resource, mode: "private", allowed: false, reason: "CONTENT_ACCESS_REQUIRED" })
          : (await getPublicContentAccessHint(resource, "", manualCycle ? "" : cycleEpoch, expectedPeriodId))
            || await getContentAccessStatus(resource);
        if (cancelled) return;
        setStatus({ ...(nextStatus || { resource, mode: "private", allowed: false }), cycleEpoch });
        setLoading(false);
        if (sharedToken) {
          // Remove private capabilities from browser history even when invalid.
          skipNextSessionLoadRef.current = resource;
          removeSharedTokenFromUrl();
        }
      } catch {
        if (!cancelled) {
          setStatus({ resource, mode: "private", allowed: false, cycleEpoch });
          setErrorCode("SNAPSHOT_UNAVAILABLE");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [resource, sharedToken, cycleClosed, settingsLoaded, cycleEpoch, manualCycle, expectedPeriodId]);

  const currentStatus = status?.resource === resource && status.cycleEpoch === cycleEpoch ? status : null;

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

  const resourceLabel = copy.resources[resource] || resource;
  const errorText = errorCode ? copy.errors[errorCode] || copy.errors.default : "";

  return (
    <Page containerClassName="content-access-container">
      <div className="content-access-page">
        <AccessStatusCard
          iconSrc={getAccessIcon(resource)}
          title={resourceLabel}
          heading={getAccessCopy(copy, resource, currentStatus).title}
          text={getAccessCopy(copy, resource, currentStatus).text}
        >
          {errorText && (
            <div className="content-access-error">{errorText}</div>
          )}
        </AccessStatusCard>
      </div>
    </Page>
  );
}

export default ContentAccessGate;
