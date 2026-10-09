import { Check, AlertTriangle, WandSparkles, Trash2 } from "lucide-react";
import { TURRET_IDS } from "../data/mockTurretDistribution.js";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function TurretSettings({ a, shift, setShift, turrets, players }) {
  const selectedId = "hub";
  const selected = turrets[shift][selectedId];
  const captain = players.find((p) => p.id === selected.captainId) || null;
  const assigned = players.filter((p) => selected.playerIds.includes(p.id));

  return (
    <div className="turret-layout-view">
      <div className="turret-shift-switch">
        <button type="button" className={shift === "shift1" ? "admin-primary-button" : "admin-secondary-button"} onClick={() => setShift("shift1")}>{a.shifts.shift1}</button>
        <button type="button" className={shift === "shift2" ? "admin-primary-button" : "admin-secondary-button"} onClick={() => setShift("shift2")}>{a.shifts.shift2}</button>
      </div>

      <div className="turret-layout-grid">
        <aside className="turret-list">
          {TURRET_IDS.map((id) => {
            const turret = turrets[shift][id];
            const cap = players.find((p) => p.id === turret.captainId);
            return (
              <button key={id} type="button" className={id === selectedId ? "turret-list-card turret-list-card--active" : "turret-list-card"}>
                <div className="turret-list-card__icon">♜</div>
                <div><strong>{a.distribution.towers[id]}</strong><span>{cap ? cap.nickname : a.distribution.turret.noCaptain}</span><small>{a.distribution.players}: {turret.playerIds.length}</small></div>
                {cap ? <Check className="turret-list-card__ok" size={20} /> : <AlertTriangle className="turret-list-card__warn" size={20} />}
              </button>
            );
          })}
        </aside>

        <section className="turret-detail-card">
          <div className="turret-detail-head">
            <div><span className="turret-detail-icon">♜</span><h3>{a.distribution.towers[selectedId]}</h3></div>
            <span className="admin-badge admin-badge--blue">{selected.troopType ? a.troops[selected.troopType] : a.distribution.turret.typeByCaptain}</span>
          </div>

          <div className="turret-detail-options">
            <label><input type="checkbox" checked readOnly />{a.distribution.refill.onlyCaptains}</label>
            <label><input type="checkbox" checked readOnly />{a.distribution.refill.respectShift}</label>
            <label><input type="checkbox" checked readOnly />{a.distribution.refill.sameTroopType}</label>
            <label><input type="checkbox" readOnly />{a.distribution.refill.allowFlexible}</label>
          </div>

          <div className="turret-captain-row">
            <label className="admin-field">
              <span>{a.distribution.turret.captain}</span>
              <select value={captain?.id || ""} readOnly>
                <option value="">{a.distribution.turret.noCaptain}</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.nickname} • {p.alliance} • {a.troops[p.troopType]} {p.tier}</option>)}
              </select>
            </label>
            <button type="button" className="admin-secondary-button">{a.distribution.turret.setCaptain}</button>
            <button type="button" className="admin-secondary-button"><WandSparkles size={16} />{a.distribution.turret.autofill}</button>
            <button type="button" className="admin-secondary-button"><Trash2 size={16} />{a.distribution.turret.clear}</button>
          </div>

          <div className="turret-metrics">
            <article><span>{a.distribution.turret.captainMarch}</span><strong>{formatNumber(captain?.marchSize)}</strong></article>
            <article><span>{a.distribution.turret.rally}</span><strong>{formatNumber(captain?.rallySize)}</strong></article>
            <article><span>{a.distribution.turret.total}</span><strong>{formatNumber((captain?.marchSize || 0) + (captain?.rallySize || 0))}</strong></article>
            <article><span>{a.distribution.turret.free}</span><strong>{formatNumber(captain?.rallySize)}</strong></article>
          </div>

          <details className="turret-details-box">
            <summary>{a.distribution.turret.settingsAndLimits}</summary>
            <div className="turret-details-placeholder">{a.distribution.turret.logicLater}</div>
          </details>

          <details className="turret-details-box">
            <summary>{a.distribution.turret.addManual}</summary>
            <div className="turret-details-placeholder">{a.distribution.turret.logicLater}</div>
          </details>

          <div className="turret-assigned-card">
            <div className="turret-assigned-card__head"><h4>{a.distribution.turret.playersInTurret}</h4><span>{a.distribution.turret.captainAndPlayers}</span></div>
            <div className="turret-assigned-table turret-assigned-table--head"><span>{a.distribution.columns.player}</span><span>{a.distribution.columns.alliance}</span><span>{a.distribution.columns.role}</span><span>{a.distribution.columns.tier}</span><span>{a.distribution.columns.march}</span></div>
            {assigned.map((p) => (
              <div className="turret-assigned-table" key={p.id}><strong>{p.nickname}</strong><span>{p.alliance}</span><span>{p.captain ? a.distribution.turret.captain : a.distribution.turret.player}</span><span>{p.tier}</span><span>{formatNumber(p.marchSize)}</span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TurretSettings;
