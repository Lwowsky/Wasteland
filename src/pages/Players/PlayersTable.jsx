import { ChevronLeft, ChevronRight } from "lucide-react";

import StatusBadge from "../../components/PlayerBadges/StatusBadge.jsx";
import TierBadge from "../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../components/PlayerBadges/TroopBadge.jsx";
import useNow from "../../hooks/useNow.js";
import { formatPlayerTimeAgo } from "./playersTable.js";

function PlayerRow({ player, t, now }) {
  return (
    <div className="players-table__row">
      <strong className="players-table__nickname">{player.nickname}</strong>

      <span>
        <span className="player-badge player-badge--alliance">
          {player.alliance}
        </span>
      </span>

      <span>
        <TroopBadge
          type={player.troopType}
          label={player.troopType ? t.players.troops[player.troopType] : "—"}
          compact
        />
      </span>

      <span>
        <TierBadge tier={player.tier} compact />
      </span>

      <span>
        <StatusBadge
          type="shift"
          value={player.shift}
          t={{
            shifts: t.players.shifts,
            yes: t.players.table.yes,
            no: t.players.table.no,
          }}
          compact
        />
      </span>

      <span>
        <StatusBadge
          type="captain"
          value={player.readiness?.captain}
          t={{
            shifts: t.players.shifts,
            yes: t.players.table.yes,
            no: t.players.table.no,
          }}
          compact
        />
      </span>

      <span className="players-table__time">
        {formatPlayerTimeAgo(player.createdAt, t, now)}
      </span>
    </div>
  );
}

function PlayersTable({
  t,
  loading,
  loadError,
  filteredCount,
  visiblePlayers,
  pageSize,
  pagination,
  onPreviousPage,
  onNextPage,
}) {
  const now = useNow(60 * 1000);

  return (
    <section className="players-table">
      <div className="players-table__head">
        <span>{t.players.table.nickname}</span>
        <span>{t.players.table.alliance}</span>
        <span>{t.players.table.troops}</span>
        <span>{t.players.table.tier}</span>
        <span>{t.players.table.shift}</span>
        <span>{t.players.table.captain}</span>
        <span>{t.players.table.when}</span>
      </div>

      {loading ? (
        <div className="players-table__empty">{t.players.loading}</div>
      ) : loadError ? (
        <div className="players-table__empty">{t.players.errors.load}</div>
      ) : filteredCount > 0 ? (
        visiblePlayers.map((player) => (
          <PlayerRow key={player.id} player={player} t={t} now={now} />
        ))
      ) : (
        <div className="players-table__empty">{t.players.empty}</div>
      )}

      {!loading &&
        !loadError &&
        filteredCount > 0 &&
        pageSize !== "all" &&
        pagination.totalPages > 1 && (
          <nav
            className="players-table__pagination"
            aria-label={t.players.pagination.label}
          >
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={pagination.page <= 1}
              aria-label={t.players.pagination.previous}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>

            <span>
              {t.players.pagination.pageOf
                .replace("{{page}}", String(pagination.page))
                .replace("{{pages}}", String(pagination.totalPages))}
            </span>

            <button
              type="button"
              onClick={onNextPage}
              disabled={pagination.page >= pagination.totalPages}
              aria-label={t.players.pagination.next}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </nav>
        )}
    </section>
  );
}

export default PlayersTable;
