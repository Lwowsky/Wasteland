import { Globe2, MapPin, PencilLine, Type } from "lucide-react";
import { useEffect, useState } from "react";

import { clearSiteSettingsCache, getSiteSettings } from "../../../features/site/siteSettingsApi.js";
import { saveAdminSiteSettings } from "../services/systemSettingsApi.js";
import SiteIdentityModal from "./SiteIdentityModal.jsx";

import "./SiteIdentity.css";

function SiteIdentityPanel({ t, isOwner }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getSiteSettings({ force: true });
        if (active) setSettings(result.settings || null);
      } catch (nextError) {
        console.error("Load site identity:", nextError);
        if (active) setError(t.errors.load);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [t.errors.load]);

  async function handleSave(payload) {
    if (!isOwner || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await saveAdminSiteSettings(payload);
      const nextSettings = result.settings || payload;

      setSettings(nextSettings);
      clearSiteSettingsCache();
      window.dispatchEvent(new Event("site-settings-updated"));
      setMessage(t.saved);
      setModalOpen(false);
    } catch (nextError) {
      console.error("Save site identity:", nextError);
      setError(t.errors.save);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <article className="settings-site-card">
        <div className="settings-site-card__lead">
          <div className="settings-site-card__icon" aria-hidden="true">
            <Globe2 size={28} />
          </div>

          <div>
            <span className="settings-site-card__eyebrow">{t.eyebrow}</span>
            <h3>{t.title}</h3>
            <p>{t.description}</p>
          </div>
        </div>

        <div className="settings-site-card__summary" aria-busy={loading}>
          <div>
            <Type size={15} aria-hidden="true" />
            <span>{t.summary.siteName}</span>
            <strong>{settings?.siteName || "—"}</strong>
          </div>

          <div>
            <MapPin size={15} aria-hidden="true" />
            <span>{t.summary.region}</span>
            <strong>
              {settings
                ? `${settings.regionNumber} · ${settings.regionName}`
                : "—"}
            </strong>
          </div>

          <div>
            <Globe2 size={15} aria-hidden="true" />
            <span>{t.summary.brand}</span>
            <strong>{settings?.brandText || "—"}</strong>
          </div>
        </div>

        <div className="settings-site-card__actions">
          {!isOwner && <small>{t.ownerOnly}</small>}
          {message && <small className="is-success">{message}</small>}
          {error && <small className="is-error">{error}</small>}

          {isOwner && (
            <button
              type="button"
              className="admin-primary-button"
              onClick={() => {
                setError("");
                setMessage("");
                setModalOpen(true);
              }}
              disabled={loading || !settings}
            >
              <PencilLine size={17} aria-hidden="true" />
              {t.edit}
            </button>
          )}
        </div>
      </article>

      {settings && modalOpen && (
        <SiteIdentityModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          copy={t}
          settings={settings}
          saving={saving}
          error={error}
          onSave={handleSave}
        />
      )}
    </>
  );
}

export default SiteIdentityPanel;
