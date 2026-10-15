import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "../services/adminApi.js";
import Modal from "../../../components/Modal/Modal.jsx";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal.jsx";
import { publicAsset } from "../../../utils/publicAsset.js";
import "./SharedConsulPanel.css";

const ACCESS_ICON = publicAsset("/images/admin/icons/settings/access-control.webp");
const fmt = (seconds) => seconds ? new Date(seconds * 1000).toLocaleString() : null;
const isLive = (entry, nowSeconds) => !entry.revokedAt && (!entry.expiresAt || entry.expiresAt > nowSeconds);

export default function SharedConsulPanel({ t, cancelLabel }) {
  const [data, setData] = useState({ credentials: [], legacy: null, checkedAt: 0 });
  const [tab, setTab] = useState("active");
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("wasteland");
  const [revealed, setRevealed] = useState(null);
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const result = await adminRequest("/api/admin/shared-consul");
    setData({ credentials: result.credentials || [], legacy: result.legacy || null, checkedAt: Date.now() / 1000 });
  }, []);
  useEffect(() => {
    let active = true;
    adminRequest("/api/admin/shared-consul").then((result) => {
      if (active) setData({ credentials: result.credentials || [], legacy: result.legacy || null, checkedAt: Date.now() / 1000 });
    }).catch((cause) => { if (active) setError(cause?.message || t.failed); });
    return () => { active = false; };
  }, [t.failed]);

  const active = data.credentials.filter((entry) => isLive(entry, data.checkedAt));
  const history = data.credentials.filter((entry) => !isLive(entry, data.checkedAt));
  const legacyLive = Boolean(data.legacy && (!data.legacy.expiresAt || data.legacy.expiresAt > data.checkedAt));
  const count = active.length + (legacyLive ? 1 : 0);
  function closeReveal() { setRevealed(null); setVisible(false); setNotice(false); }
  async function execute() {
    if (!pending || busy) return;
    setBusy(true); setError("");
    try {
      const { action, id, nextDuration } = pending;
      if (action === "create") {
        const result = await adminRequest("/api/admin/shared-consul", { method: "POST", body: JSON.stringify({ action, label: label.trim(), duration }) });
        setRevealed({ password: result.password, credential: result.credential });
        setVisible(true);
        setLabel("");
        setTab("active");
      } else if (action === "revoke" || action === "purge") {
        const query = new URLSearchParams({ id });
        if (action === "purge") query.set("purge", "1");
        await adminRequest(`/api/admin/shared-consul?${query}`, { method: "DELETE" });
        if (revealed?.credential?.id === id) closeReveal();
      } else if (action === "extend") {
        await adminRequest("/api/admin/shared-consul", { method: "POST", body: JSON.stringify({ action, id, duration: nextDuration }) });
      }
      setPending(null);
      await refresh();
    } catch (e) {
      setError(e.message === "NO_WASTELAND_END" ? t.noWasteland : e.message === "MAX_ACTIVE_KEYS" ? t.limitReached : e.message === "ACTIVE_KEY_CANNOT_BE_DELETED" ? t.deleteBlocked : e.message);
    } finally { setBusy(false); }
  }
  async function showPassword(credential) {
    setBusy(true); setError("");
    try {
      const result = await adminRequest("/api/admin/shared-consul", { method: "POST", body: JSON.stringify({ action: "reveal", id: credential.id }) });
      setRevealed({ password: result.password, credential }); setVisible(false); setNotice(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function copyPassword() {
    if (!revealed?.password) return;
    try { await navigator.clipboard.writeText(revealed.password); setNotice(true); }
    catch { setError(t.copyFailed || t.failed); }
  }
  const buttons = [{ id: "active", title: `${t.tabsActive} (${count})` }, { id: "history", title: `${t.tabsHistory} (${history.length})` }, { id: "create", title: t.tabsCreate }];
  return (
    <section className="shared-consul-panel" aria-label={t.title}>
      <div className="shared-consul-panel__heading">
        <div><strong>{t.title}</strong><p>{t.multipleDescription}</p></div>
        <span className="shared-consul-panel__counter">{count} / 5</span>
      </div>
      <div className="shared-consul-panel__tabs" role="tablist" aria-label={t.title}>
        {buttons.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-selected" : ""} onClick={() => { setTab(item.id); setError(""); }}>{item.title}</button>)}
      </div>
      {tab === "create" && <div className="shared-consul-panel__create-page">
        <p>{t.createHint}</p>
        <div className="shared-consul-panel__create">
          <label className="shared-consul-panel__field"><span>{t.keyName}</span><input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder={t.keyPlaceholder}/></label>
          <label className="shared-consul-panel__field"><span>{t.duration}</span><select value={duration} onChange={(e) => setDuration(e.target.value)}><option value="day">{t.day}</option><option value="wasteland">{t.wasteland}</option><option value="forever">{t.forever}</option></select></label>
          <button type="button" className="admin-primary-button" disabled={busy || count >= 5 || !label.trim()} onClick={() => setPending({ action: "create" })}>{t.generate}</button>
        </div>
      </div>}
      {tab === "active" && <div className="shared-consul-panel__list">
        {!count && <p className="shared-consul-panel__empty">{t.emptyActive}</p>}
        {legacyLive && <article className="shared-consul-panel__item shared-consul-panel__legacy"><div className="shared-consul-panel__item-header"><strong>{t.legacyKey}</strong><span className="shared-consul-panel__live">{t.active}</span></div><p>{t.historyLegacy}</p><div className="shared-consul-panel__actions"><button type="button" className="admin-secondary-button shared-consul-panel__danger" disabled={busy} onClick={() => setPending({ action: "revoke", id: "legacy" })}>{t.revoke}</button></div></article>}
        {active.map((credential) => <article className="shared-consul-panel__item" key={credential.id}>
          <div className="shared-consul-panel__item-header"><strong>{credential.label}</strong><span className="shared-consul-panel__live">{t.active}</span></div>
          <span>{credential.expiresAt ? `${t.copyExpires} ${fmt(credential.expiresAt)}` : t.forever}</span>
          <div className="shared-consul-panel__actions"><button type="button" className="admin-secondary-button" disabled={busy} onClick={() => showPassword(credential)}>{t.showPassword}</button>
          <select disabled={busy} aria-label={t.confirmUpdate} value="" onChange={(e) => { if (e.target.value) setPending({ action: "extend", id: credential.id, nextDuration: e.target.value }); }}><option value="">{t.confirmUpdate}</option><option value="day">{t.day}</option><option value="wasteland">{t.wasteland}</option><option value="forever">{t.forever}</option></select>
          <button type="button" className="admin-secondary-button shared-consul-panel__danger" disabled={busy} onClick={() => setPending({ action: "revoke", id: credential.id })}>{t.revoke}</button></div>
        </article>)}
      </div>}
      {tab === "history" && <div className="shared-consul-panel__history"><p>{t.historyHint}</p><div className="shared-consul-panel__list">
        {!history.length && <p className="shared-consul-panel__empty">{t.emptyHistory}</p>}
        {history.map((credential) => <article className="shared-consul-panel__item" key={credential.id}><div className="shared-consul-panel__item-header"><strong>{credential.label}</strong><span className="shared-consul-panel__disabled">{credential.revokedAt ? t.revoked : t.expired}</span></div><span>{t.createdAt} {fmt(credential.createdAt)}</span><div className="shared-consul-panel__actions"><button type="button" className="admin-secondary-button shared-consul-panel__danger" disabled={busy} onClick={() => setPending({ action: "purge", id: credential.id })}>{t.deleteHistory}</button></div></article>)}
      </div></div>}
      {error && <p role="alert" className="shared-consul-panel__error">{error}</p>}
      <ConfirmModal open={Boolean(pending)} title={t.title}
        message={pending?.action === "purge" ? t.confirmDeleteHistory : pending?.action === "revoke" ? t.confirmSingleRevoke : pending?.action === "extend" ? t.confirmChangeDuration : t.confirmAdd}
        confirmLabel={pending?.action === "purge" ? t.deleteHistory : pending?.action === "revoke" ? t.revoke : pending?.action === "extend" ? t.confirmUpdate : t.generate}
        cancelLabel={cancelLabel || t.cancel} tone={pending?.action === "revoke" || pending?.action === "purge" ? "danger" : "warning"} iconSrc={ACCESS_ICON}
        busy={busy} onConfirm={execute} onCancel={() => setPending(null)} />
      <Modal open={Boolean(revealed)} onClose={closeReveal} title={notice ? t.copySuccessTitle : t.showPassword} closeLabel={t.close} width="600px" className="shared-consul-copy-modal"
        footer={<div className="shared-consul-copy-modal__footer"><button type="button" className="admin-primary-button" onClick={closeReveal}>{t.ok}</button></div>}>
        {revealed && <div className="shared-consul-panel__result"><strong>{revealed.credential.label}</strong><p>{notice ? t.copySuccess : t.passwordPrivacy}</p><div className="shared-consul-panel__password-row"><output className="shared-consul-panel__password">{visible ? revealed.password : "••••••••••••••••"}</output><button type="button" className="admin-secondary-button" onClick={() => setVisible(!visible)}>{visible ? t.hidePassword : t.showPassword}</button></div><button type="button" className="admin-secondary-button" onClick={copyPassword}>{t.copyPassword}</button><p className="shared-consul-copy-modal__expiry">{revealed.credential.expiresAt ? `${t.copyExpires} ${fmt(revealed.credential.expiresAt)}` : t.copyForeverWarning}</p></div>}
      </Modal>
    </section>
  );
}
