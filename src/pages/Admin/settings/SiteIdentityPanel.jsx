import { useEffect, useState } from "react";

import { clearSiteSettingsCache, getSiteSettings } from "../../../features/site/siteSettingsApi.js";
import { saveAdminSiteSettings } from "../services/systemSettingsApi.js";
import SiteIdentityModal from "./SiteIdentityModal.jsx";

import "./SiteIdentity.css";

const SITE_APPEARANCE_ICON = "/images/admin/icons/settings/site-appearance.webp";
const EDIT_ICON = "/images/admin/icons/actions/edit.webp";
const SITE_NAME_ICON = "/images/admin/icons/settings/identity-site-name.webp";
const REGION_ICON = "/images/admin/icons/settings/identity-region-pin.webp";
const BRAND_ICON = "/images/admin/icons/settings/identity-brand-text.webp";

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
            <img
              className="settings-section-icon"
              src={SITE_APPEARANCE_ICON}
              alt=""
            />
          </div>

          <div>
            <span className="settings-site-card__eyebrow">{t.eyebrow}</span>
            <h3>{t.title}</h3>
            <p>{t.description}</p>
          </div>
        </div>

        <div className="settings-site-card__summary" aria-busy={loading}>
          <div>
            <img className="settings-site-card__summary-icon" src={SITE_NAME_ICON} alt="" aria-hidden="true" />
            <span>{t.summary.siteName}</span>
            <strong>{settings?.siteName || "—"}</strong>
          </div>

          <div>
            <img className="settings-site-card__summary-icon" src={REGION_ICON} alt="" aria-hidden="true" />
            <span>{t.summary.region}</span>
            <strong>
              {settings
                ? `${settings.regionNumber} · ${settings.regionName}`
                : "—"}
            </strong>
          </div>

          <div>
            <img className="settings-site-card__summary-icon" src={BRAND_ICON} alt="" aria-hidden="true" />
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
              <img
                className="settings-inline-button-icon"
                src={EDIT_ICON}
                alt=""
                aria-hidden="true"
              />
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
