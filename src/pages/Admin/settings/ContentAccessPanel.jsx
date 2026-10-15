import SharedConsulPanel from "./SharedConsulPanel.jsx";
import ContentAccessEditor from "./ContentAccessEditor.jsx";
import { publicAsset } from "../../../utils/publicAsset.js";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ROUTES, getRoute } from "../../../config/routes.js";
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

function ContentAccessPanel({ t, language, sharedConsulT, cancelLabel }) {
  const [resources, setResources] = useState({});
  const [drafts, setDrafts] = useState({});
  const [selectedResource, setSelectedResource] = useState("players");
  const isSharedConsul = selectedResource === "shared_consul";
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
        {[...RESOURCES, ...(sharedConsulT ? ["shared_consul"] : [])].map((resource) => (
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
              src={resource === "players" ? ACCESS_UI_ICONS.players : resource === "final_plan" ? ACCESS_UI_ICONS.finalPlan : ACCESS_CONTROL_ICON}
              alt=""
              aria-hidden="true"
            />
            {resource === "shared_consul" ? sharedConsulT.title : t.resources[resource]}
          </button>
        ))}
      </div>

      {isSharedConsul ? (
        <SharedConsulPanel t={sharedConsulT} cancelLabel={cancelLabel} />
      ) : loading ? (
        <div className="settings-access-loading">
          <RefreshCw size={18} aria-hidden="true" />
          {t.loading}
        </div>
      ) : (
        <ContentAccessEditor
          t={t}
          language={language}
          active={active}
          draft={draft}
          generated={generated}
          selectedResource={selectedResource}
          status={status}
          statusIcon={statusIcon}
          messageKey={messageKey}
          errorKey={errorKey}
          busy={busy}
          icons={ACCESS_UI_ICONS}
          updateDraft={updateDraft}
          copyGenerated={copyGenerated}
          save={save}
          generate={generate}
          revoke={revoke}
        />
      )}
    </article>
  );
}

export default ContentAccessPanel;
