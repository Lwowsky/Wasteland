import { useMemo, useState } from "react";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function PlayerStatus({ a, players }) {
  const [filter, setFilter] = useState("all");
  const inTurrets = players.filter((p) => p.turretId);
  const reserve = players.filter((p) => !p.turretId);
  const list = useMemo(() => filter === "turrets" ? inTurrets : filter === "reserve" ? reserve : players, [filter, inTurrets, reserve, players]);

  return (
    <div className="turret-player-status">
      <div className="turret-status-cards">
        <article><strong>{inTurrets.length}</strong><span>{a.distribution.status.inTurrets}</span><small>{a.distribution.status.realNow}</small></article>
        <article><strong>{reserve.length}</strong><span>{a.distribution.status.reserve}</span><small>{a.distribution.status.notAssigned}</small></article>
        <article><strong>{players.length}</strong><span>{a.distribution.status.total}</span><small>{a.distribution.status.allPlayers}</small></article>
      </div>
      <div className="turret-filter-pills">
        <button type="button" aria-pressed={filter === "all"} className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>{a.distribution.status.all}</button>
        <button type="button" aria-pressed={filter === "turrets"} className={filter === "turrets" ? "active" : ""} onClick={() => setFilter("turrets")}>{a.distribution.status.inTurrets}</button>
        <button type="button" aria-pressed={filter === "reserve"} className={filter === "reserve" ? "active" : ""} onClick={() => setFilter("reserve")}>{a.distribution.status.reserve}</button>
      </div>
      <div className="turret-status-table turret-status-table--head"><span>{a.distribution.columns.player}</span><span>{a.distribution.columns.alliance}</span><span>{a.distribution.columns.roleTier}</span><span>{a.distribution.columns.march}</span><span>{a.distribution.columns.status}</span><span>{a.distribution.columns.turret}</span><span>{a.distribution.columns.actions}</span></div>
      {list.map((p) => (
        <div className="turret-status-table" key={p.id}><strong>{p.nickname}</strong><span>{p.alliance}</span><span>{a.troops[p.troopType]} / {p.tier}</span><span>{formatNumber(p.marchSize)}</span><span><em className={p.turretId ? "turret-state turret-state--in" : "turret-state"}>{p.turretId ? a.distribution.status.inTurrets : a.distribution.status.reserve}</em></span><span>{p.turretId ? `${a.distribution.towers[p.turretId]} · ${a.shifts[p.shift]}` : "—"}</span><span><button type="button" className="admin-secondary-button">{p.turretId ? a.distribution.status.toReserve : a.distribution.status.assign}</button></span></div>
      ))}
    </div>
  );
}

export default PlayerStatus;
