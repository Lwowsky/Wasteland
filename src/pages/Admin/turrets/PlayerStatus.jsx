import { formatMarch } from "../../../utils/formatMarch.js";
import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../../components/PlayerBadges/TroopBadge.jsx";
import { useMemo, useState } from "react";
import { getAssignmentSummary, removeAssignedPlayer } from "../../../features/turrets/turretAssignments.js";
import { filterPlayerStatus } from "../../../features/turrets/playerStatusFilters.js";
import "./PlayerStatus.css";

function PlayerStatus({ a, language, players, assignments, apply, editable, loaded, activeShifts = ["shift1", "shift2"] }) {
  const [filter, setFilter] = useState("all");
  const [shift, setShift] = useState("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const summary = useMemo(() => getAssignmentSummary(assignments, players), [assignments, players]);
  const list = useMemo(() => filterPlayerStatus(players, assignments, {
    status: filter, shift, search: query,
  }), [filter, shift, query, assignments, players]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const s = a.distribution.status;

  function changeFilter(value) { setFilter(value); setPage(1); }
  function changeShift(value) { setShift(value); setPage(1); }
  function toReserve(player) {
    const result = removeAssignedPlayer(assignments, player.id);
    if (result.error) { setError(a.distribution.manual.errors[result.error]); return; }
    setError("");
    apply(() => result);
  }

  return (
    <div className="turret-player-status">
      <div className="turret-status-cards">
        {([
          ["assigned", "inTurrets", "realNow", "/images/turrets/tower-turret.webp"],
          ["reserve", "reserve", "notAssigned", "/images/admin/icons/actions/players.webp"],
          ["total", "total", "allPlayers", "/images/admin/icons/actions/players.webp"],
        ]).map(([key, label, detail, image]) => (
          <article className={`turret-status-card turret-status-card--${key}`} key={key}>
            <span className="turret-status-card__image" aria-hidden="true">
              <img src={image} alt="" loading="lazy" />
            </span>
            <div className="turret-status-card__content">
              <span className="turret-status-card__label">{s[label]}</span>
              <strong className="turret-status-card__number">{loaded ? summary[key] : "—"}</strong>
              <small className="turret-status-card__detail">{s[detail]}</small>
            </div>
          </article>
        ))}
      </div>
      {error && <p className="turret-draft-feedback turret-draft-feedback--error" role="alert">{error}</p>}
      <div className="turret-status-controls">
        <div className="turret-filter-pills">
          {([["all", s.all], ["turrets", s.inTurrets], ["reserve", s.reserve]]).map(([key, label]) =>
            <button key={key} type="button" aria-pressed={filter === key}
              className={filter === key ? "active" : ""} onClick={() => changeFilter(key)}>{label}</button>)}
        </div>
        <div className="turret-status-inputs">
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            aria-label={s.search} placeholder={s.search} />
          <select aria-label={s.shiftFilter} value={shift} onChange={(event) => changeShift(event.target.value)}>
            <option value="all">{s.allShifts}</option>
            {activeShifts.map((key) => <option key={key} value={key}>{a.shifts[key]}</option>)}
            <option value="flexible">{a.shifts.flexible}</option>
          </select>
          <select aria-label={s.perPage} value={pageSize}
            onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            {[20, 50, 100].map((size) => <option key={size} value={size}>{size} {s.perPage}</option>)}
          </select>
        </div>
      </div>
      <div className="turret-status-scroll">
        <div className="turret-status-table turret-status-table--head">
          <span>{a.distribution.columns.player}</span><span>{a.distribution.columns.alliance}</span>
          <span>{a.distribution.columns.roleTier}</span><span>{a.distribution.columns.march}</span>
          <span>{a.distribution.columns.status}</span><span>{a.distribution.columns.turret}</span>
          <span>{a.distribution.columns.actions}</span>
        </div>
        {visible.map(({ player: p, location }) => <div className="turret-status-table" key={p.id}>
          <strong className="turret-status-player" title={p.nickname}>{p.nickname}</strong>
          <span className="turret-status-alliance" title={p.alliance || ""}>{p.alliance || "—"}</span>
          <span className="turret-status-badges">
            {p.troopType && a.troops[p.troopType]
              ? <TroopBadge type={p.troopType} label={a.troops[p.troopType]} compact />
              : <span>—</span>}
            {p.tier ? <TierBadge tier={p.tier} compact /> : <span>—</span>}
          </span>
          <span className="turret-status-march">{formatMarch(p.marchSize, language)}</span>
          <span><em className={location ? "turret-state turret-state--in" : "turret-state"}>
            {location ? s.inTurrets : s.reserve}</em></span>
          <span className="turret-status-location" title={location ? `${a.distribution.towers[location.tower]} · ${a.shifts[location.shift]}` : ""}>
            {location ? `${a.distribution.towers[location.tower]} · ${a.shifts[location.shift]}` : "—"}
          </span>
          <span className="turret-status-action">{location ? <button type="button" className="admin-secondary-button turret-status-reserve-btn"
            disabled={!editable || !loaded} onClick={() => toReserve(p)}>{s.toReserve}</button>
            : <span className="turret-unassigned-action">{a.distribution.manual.chooseTurret}</span>}</span>
        </div>)}
      </div>
      {!visible.length && <p className="turret-status-empty">{s.noResults}</p>}
      <nav className="turret-status-pagination" aria-label={s.pagination}>
        <span>{s.matches.replace("{{count}}", String(list.length))}</span>
        <div>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>{s.previous}</button>
          <span>{currentPage} / {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>{s.next}</button>
        </div>
      </nav>
    </div>
  );
}
export default PlayerStatus;
