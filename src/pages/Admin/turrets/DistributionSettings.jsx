import { RefreshCw, Send, RotateCcw, Trash2 } from "lucide-react";

function Toggle({ checked, label }) {
  return (
    <label className="turret-toggle-card">
      <input type="checkbox" checked={checked} readOnly />
      <span>{label}</span>
    </label>
  );
}

function DistributionSettings({ a, settings, setSettings, stats }) {
  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="turret-settings-view">
      <div className="turret-summary-grid">
        <article className="turret-summary-card">
          <strong>{stats.shift1}</strong>
          <span>{a.distribution.summary.shift1}</span>
          <small>{a.distribution.summary.inTurrets}: {stats.shift1}</small>
        </article>
        <article className="turret-summary-card">
          <strong>{stats.shift2}</strong>
          <span>{a.distribution.summary.shift2}</span>
          <small>{a.distribution.summary.inTurrets}: {stats.shift2}</small>
        </article>
        <article className="turret-summary-card">
          <strong>{stats.flexible}</strong>
          <span>{a.distribution.summary.flexible}</span>
          <small>{a.distribution.summary.separate}</small>
        </article>
        <article className="turret-summary-card">
          <strong>{stats.total}</strong>
          <span>{a.distribution.summary.total}</span>
          <small>{a.distribution.summary.reserve}: {stats.reserve}</small>
        </article>
      </div>

      <div className="turret-action-row">
        <button type="button" className="admin-secondary-button"><RefreshCw size={16} />{a.distribution.actions.redistribute}</button>
        <button type="button" className="admin-secondary-button">{a.distribution.actions.fill}</button>
        <button type="button" className="admin-primary-button"><Send size={16} />{a.distribution.actions.publish}</button>
        <button type="button" className="admin-secondary-button"><RotateCcw size={16} />{a.distribution.actions.restore}</button>
        <button type="button" className="admin-secondary-button"><Trash2 size={16} />{a.distribution.actions.clear}</button>
      </div>

      <section className="turret-config-card">
        <h3>{a.distribution.refill.title}</h3>
        <div className="turret-config-row turret-config-row--five">
          <label className="admin-field">
            <span>{a.distribution.refill.mode}</span>
            <select value={settings.mode} onChange={(e) => update("mode", e.target.value)}>
              <option value="balanced">{a.distribution.refill.balanced}</option>
              <option value="maxMarch">{a.distribution.refill.maxMarch}</option>
              <option value="manual">{a.distribution.refill.manual}</option>
            </select>
          </label>
          <Toggle checked={settings.onlyCaptains} label={a.distribution.refill.onlyCaptains} />
          <Toggle checked={settings.respectShift} label={a.distribution.refill.respectShift} />
          <Toggle checked={settings.sameTroopType} label={a.distribution.refill.sameTroopType} />
          <Toggle checked={settings.allowFlexible} label={a.distribution.refill.allowFlexible} />
        </div>
      </section>

      <div className="turret-config-grid">
        <section className="turret-config-card">
          <div className="turret-config-card__title-row">
            <h3>{a.distribution.limits.allianceTitle}</h3>
            <span className="admin-badge admin-badge--gray">0 {a.distribution.players}</span>
          </div>
          <label className="turret-inline-check">
            <input type="checkbox" checked={settings.allianceLimits} onChange={(e) => update("allianceLimits", e.target.checked)} />
            {a.distribution.limits.manual}
          </label>
          <div className="turret-limit-grid">
            <label><span>{a.shifts.shift1}</span><input value={settings.shift1Limit} readOnly /></label>
            <label><span>{a.shifts.shift2}</span><input value={settings.shift2Limit} readOnly /></label>
            <label><span>{a.distribution.limits.addShift1}</span><input value={settings.shift1Extra} readOnly /></label>
            <label><span>{a.distribution.limits.addShift2}</span><input value={settings.shift2Extra} readOnly /></label>
          </div>
        </section>

        <section className="turret-config-card">
          <h3>{a.distribution.limits.tierTitle}</h3>
          <label className="turret-inline-check">
            <input type="checkbox" checked={settings.tierLimitsEnabled} onChange={(e) => update("tierLimitsEnabled", e.target.checked)} />
            {a.distribution.limits.useSaved}
          </label>
          <p className="turret-muted">{a.distribution.limits.tierText}</p>
          <div className="turret-tier-grid">
            {Object.entries(settings.tierLimits).map(([tier, value]) => (
              <label key={tier}><span>{tier}</span><input value={value} readOnly /></label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DistributionSettings;
