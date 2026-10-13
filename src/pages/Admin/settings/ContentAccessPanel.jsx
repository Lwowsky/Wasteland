import { publicAsset } from "../../../utils/publicAsset.js";

import { Copy, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ROUTES, getRoute } from "../../../config/routes.js";
import { formatMediumDateTime } from "../../../utils/date.js";
import {
  generateAdminContentAccessToken,
  getAdminContentAccess,
  revokeAdminContentAccessToken,
  saveAdminContentAccess,
} from "../services/contentAccessApi.js";
import "./ContentAccessPanel.css";

const RESOURCES = ["players", "final_plan"];
const ACCESS_CONTROL_ICON = publicAsset("/images/admin/icons/settings/access-control.webp");
const ACCESS_UI_ICONS = {
  players: publicAsset("/images/admin/icons/actions/players.webp"),
  finalPlan: publicAsset("/images/admin/icons/actions/lock.webp"),
  public: publicAsset("/images/admin/icons/actions/approve.webp"),
  private: publicAsset("/images/admin/icons/actions/lock.webp"),
  active: publicAsset("/images/admin/icons/settings/access-control.webp"),
  warning: publicAsset("/images/admin/icons/actions/reject.webp"),
  code: publicAsset("/images/admin/icons/actions/lock.webp"),
  link: publicAsset("/images/admin/icons/settings/access-control.webp"),
  revoke: publicAsset("/images/admin/icons/actions/reject.webp"),
};

function createDraft(resource) {
  return {
    mode: resource?.mode || "public",
    useLimit: Number(resource?.useLimit ?? 1),
    sessionMinutes: Number(resource?.sessionMinutes ?? 30),
    tokenTtlMinutes: Number(resource?.tokenTtlMinutes ?? 0),
  };
}

function ContentAccessPanel({ t, language }) {
  const [resources, setResources] = useState({});
  const [drafts, setDrafts] = useState({});
  const [selectedResource, setSelectedResource] = useState("players");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [messageKey, setMessageKey] = useState("");
  const [generated, setGenerated] = useState(null);

  const active = resources[selectedResource] || null;
  const draft = drafts[selectedResource] || createDraft(active);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorKey("");

      try {
        const result = await getAdminContentAccess();
        const nextResources = result.resources || {};

        if (!mounted) return;

        setResources(nextResources);
        setDrafts(
          Object.fromEntries(
            RESOURCES.map((resource) => [
              resource,
              createDraft(nextResources[resource]),
            ]),
          ),
        );
      } catch (nextError) {
        console.error("Load content access:", nextError);

        if (mounted) {
          setErrorKey("load");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  function selectResource(resource) {
    if (resource === selectedResource) {
      return;
    }

    setSelectedResource(resource);
    setGenerated(null);
    setMessageKey("");
    setErrorKey("");
  }

  function updateDraft(field, value) {
    setDrafts((current) => ({
      ...current,
      [selectedResource]: {
        ...(current[selectedResource] || createDraft(active)),
        [field]: value,
      },
    }));
  }

  function applyResource(resource, nextResource) {
    setResources((current) => ({
      ...current,
      [resource]: nextResource,
    }));
    setDrafts((current) => ({
      ...current,
      [resource]: createDraft(nextResource),
    }));
  }

  async function save() {
    if (busy) return null;

    setBusy(true);
    setErrorKey("");
    setMessageKey("");

    try {
      const result = await saveAdminContentAccess(selectedResource, draft);
      applyResource(selectedResource, result.resource);
      setGenerated(null);
      setMessageKey("saved");
      return result.resource;
    } catch (nextError) {
      console.error("Save content access:", nextError);
      setErrorKey("save");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (busy) return;

    setBusy(true);
    setErrorKey("");
    setMessageKey("");
    setGenerated(null);

    try {
      const saved = await saveAdminContentAccess(selectedResource, draft);
      applyResource(selectedResource, saved.resource);

      const result = await generateAdminContentAccessToken(selectedResource);
      applyResource(selectedResource, result.resource);

      const route =
        selectedResource === "players" ? ROUTES.players : ROUTES.finalPlan;
      const value =
        result.resource?.mode === "link"
          ? new URL(
              `${import.meta.env.BASE_URL}${getRoute(language, route).slice(1)}?access=${encodeURIComponent(result.token)}`,
              window.location.origin,
            ).toString()
          : result.token;

      setGenerated({
        resource: selectedResource,
        kind: result.resource?.mode || draft.mode,
        value,
      });
      setMessageKey("generated");
    } catch (nextError) {
      console.error("Generate content access token:", nextError);
      setErrorKey(
        nextError?.message === "NO_CURRENT_PERIOD" ? "noPeriod" : "generate",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (busy) return;

    setBusy(true);
    setErrorKey("");
    setMessageKey("");

    try {
      const result = await revokeAdminContentAccessToken(selectedResource);
      applyResource(selectedResource, result.resource);
      setGenerated(null);
      setMessageKey("revoked");
    } catch (nextError) {
      console.error("Revoke content access token:", nextError);
      setErrorKey("revoke");
    } finally {
      setBusy(false);
    }
  }

  async function copyGenerated() {
    if (!generated?.value) return;

    try {
      await navigator.clipboard.writeText(generated.value);
      setMessageKey("copied");
    } catch {
      setErrorKey("copy");
    }
  }

  const status = useMemo(() => {
    if (!active) return null;

    if (active.mode === "public") {
      return { icon: ACCESS_UI_ICONS.public, label: t.status.public, className: "is-public" };
    }

    if (active.mode === "private") {
      return { icon: ACCESS_UI_ICONS.private, label: t.status.private, className: "is-private" };
    }

    if (active.token?.active) {
      return { icon: ACCESS_UI_ICONS.active, label: t.status.active, className: "is-active" };
    }

    return { icon: ACCESS_UI_ICONS.warning, label: t.status.needsToken, className: "is-warning" };
  }, [active, t.status]);

  const statusIcon = status?.icon || ACCESS_UI_ICONS.active;

  return (
    <article className="settings-tool-card settings-access-card">
      <div className="settings-access-card__head">
        <div className="settings-access-card__icon" aria-hidden="true">
          <img
            className="settings-section-icon"
            src={ACCESS_CONTROL_ICON}
            alt=""
          />
        </div>
        <div>
          <h3>{t.title}</h3>
          <p>{t.description}</p>
        </div>
      </div>

      <div className="settings-access-tabs" role="tablist" aria-label={t.resourceLabel}>
        {RESOURCES.map((resource) => (
          <button
            key={resource}
            type="button"
            role="tab"
            aria-selected={selectedResource === resource}
            className={selectedResource === resource ? "is-active" : ""}
            onClick={() => selectResource(resource)}
          >
            <img
              className="settings-access-inline-icon"
              src={resource === "players" ? ACCESS_UI_ICONS.players : ACCESS_UI_ICONS.finalPlan}
              alt=""
              aria-hidden="true"
            />
            {t.resources[resource]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="settings-access-loading">
          <RefreshCw size={18} aria-hidden="true" />
          {t.loading}
        </div>
      ) : (
        <div className="settings-access-body">
          {status && (
            <div className={`settings-access-status ${status.className}`}>
              <img className="settings-access-status-icon" src={statusIcon} alt="" aria-hidden="true" />
              <span>{status.label}</span>
              {active?.period?.cycleNumber && (
                <small>
                  {t.cycle.replace("{{cycle}}", String(active.period.cycleNumber))}
                </small>
              )}
            </div>
          )}

          <label className="settings-access-field">
            <span>{t.modeLabel}</span>
            <select
              value={draft.mode}
              onChange={(event) => updateDraft("mode", event.target.value)}
            >
              <option value="public">{t.modes.public}</option>
              <option value="private">{t.modes.private}</option>
              <option value="code">{t.modes.code}</option>
              <option value="link">{t.modes.link}</option>
            </select>
          </label>

          {["code", "link"].includes(draft.mode) && (
            <div className="settings-access-options">
              <label className="settings-access-field">
                <span>{t.useLimit.label}</span>
                <select
                  value={draft.useLimit}
                  onChange={(event) =>
                    updateDraft("useLimit", Number(event.target.value))
                  }
                >
                  <option value={1}>{t.useLimit.once}</option>
                  <option value={2}>{t.useLimit.twice}</option>
                  <option value={5}>{t.useLimit.five}</option>
                  <option value={10}>{t.useLimit.ten}</option>
                  <option value={0}>{t.useLimit.unlimited}</option>
                </select>
              </label>

              <label className="settings-access-field">
                <span>{t.session.label}</span>
                <select
                  value={draft.sessionMinutes}
                  onChange={(event) =>
                    updateDraft("sessionMinutes", Number(event.target.value))
                  }
                >
                  <option value={30}>{t.duration.minutes30}</option>
                  <option value={120}>{t.duration.hours2}</option>
                  <option value={1440}>{t.duration.hours24}</option>
                </select>
              </label>

              <label className="settings-access-field settings-access-field--wide">
                <span>{t.tokenLifetime.label}</span>
                <select
                  value={draft.tokenTtlMinutes}
                  onChange={(event) =>
                    updateDraft("tokenTtlMinutes", Number(event.target.value))
                  }
                >
                  <option value={30}>{t.duration.minutes30}</option>
                  <option value={120}>{t.duration.hours2}</option>
                  <option value={1440}>{t.duration.hours24}</option>
                  <option value={0}>{t.duration.cycle}</option>
                </select>
              </label>
            </div>
          )}

          {["code", "link"].includes(active?.mode) && active?.token && (
            <div className="settings-access-token-status">
              <strong>{t.currentToken.title}</strong>
              <span>
                {t.currentToken.hint.replace("{{hint}}", active.token.hint || "—")}
              </span>
              <span>
                {active.token.useLimit === 0
                  ? t.currentToken.unlimited
                  : t.currentToken.uses
                      .replace("{{used}}", String(active.token.usedCount || 0))
                      .replace("{{limit}}", String(active.token.useLimit || 0))}
              </span>
              {active.token.expiresAt && (
                <span>
                  {t.currentToken.expires.replace(
                    "{{date}}",
                    formatMediumDateTime(active.token.expiresAt, language),
                  )}
                </span>
              )}
            </div>
          )}

          {generated?.resource === selectedResource && (
            <div className="settings-access-generated">
              <div>
                <strong>{t.generated.title}</strong>
                <span>{t.generated.once}</span>
              </div>
              <code>{generated.value}</code>
              <button type="button" onClick={copyGenerated}>
                <Copy size={16} aria-hidden="true" />
                {t.actions.copy}
              </button>
            </div>
          )}

          {messageKey && (
            <div className="settings-access-message is-success">
              {t.messages[messageKey]}
            </div>
          )}
          {errorKey && (
            <div className="settings-access-message is-error">
              {t.errors[errorKey]}
            </div>
          )}

          <div className="settings-access-actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={save}
              disabled={busy}
            >
              {t.actions.save}
            </button>

            {["code", "link"].includes(draft.mode) && (
              <button
                type="button"
                className="admin-primary-button"
                onClick={generate}
                disabled={busy || !active?.period}
              >
                <img
                  className="settings-access-inline-icon"
                  src={draft.mode === "code" ? ACCESS_UI_ICONS.code : ACCESS_UI_ICONS.link}
                  alt=""
                  aria-hidden="true"
                />
                {draft.mode === "code"
                  ? t.actions.generateCode
                  : t.actions.generateLink}
              </button>
            )}

            {active?.token?.active && (
              <button
                type="button"
                className="settings-access-revoke"
                onClick={revoke}
                disabled={busy}
              >
                <img className="settings-access-inline-icon" src={ACCESS_UI_ICONS.revoke} alt="" aria-hidden="true" />
                {t.actions.revoke}
              </button>
            )}
          </div>

          {!active?.period && ["code", "link"].includes(draft.mode) && (
            <p className="settings-access-note">{t.noPeriod}</p>
          )}

          <p className="settings-access-note">{t.cycleNote}</p>
        </div>
      )}
    </article>
  );
}

export default ContentAccessPanel;
