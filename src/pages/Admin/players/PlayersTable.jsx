import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo } from "react";

import { getTotalPages, getVisiblePlayers } from "../../../features/players/playerPagination.js";
import PlayersTableRow from "./PlayersTableRow.jsx";
import { sortPlayers } from "./playerSorting.js";

import "../styles/players/PlayersTable.css";

function SortableHeader({ label, field, sort, onSort }) {
  const active = sort.field === field;
  const Icon = !active
    ? ArrowUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      type="button"
      className={`admin-players-sort ${active ? "admin-players-sort--active" : ""}`}
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

function PlayersTable({
  t,
  language,
  players,
  loading,
  error,
  canEdit,
  canDelete,
  sort,
  setSort,
  onEdit,
  onDelete,
  registrationSettings,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelected,
  onToggleSelectAll,
  isRowSelectable = () => true,
  getRowStatus = null,
  page = 1,
  pageSize = 10,
  onPageChange,
}) {
  const sortedPlayers = useMemo(
    () => sortPlayers(players, sort, language),
    [players, sort, language],
  );

  const totalPages = useMemo(
    () => getTotalPages(sortedPlayers.length, pageSize),
    [pageSize, sortedPlayers.length],
  );

  useEffect(() => {
    if (page > totalPages) {
      onPageChange?.(totalPages);
    }
  }, [page, totalPages, onPageChange]);

  const visiblePlayers = useMemo(
    () => getVisiblePlayers(sortedPlayers, page, pageSize),
    [page, pageSize, sortedPlayers],
  );

  function handleSort(field) {
    setSort((current) => {
      if (current.field === field) {
        return {
          field,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { field, direction: "asc" };
    });
    onPageChange?.(1);
  }

  if (loading) {
    return <div className="admin-players-state">{t.loading}</div>;
  }

  if (error) {
    return (
      <div className="admin-players-state admin-players-state--error">
        {error}
      </div>
    );
  }

  if (players.length === 0) {
    return <div className="admin-players-state">{t.empty}</div>;
  }

  return (
    <>
      <div
        className="admin-players-table-wrap"
        role="region"
        aria-label={t.title}
        tabIndex={0}
      >
        <div
          className={`admin-players-table ${selectable ? "admin-players-table--selectable" : ""}`}
        >
          <div className="admin-players-table__head">
            {selectable && (
              <span className="admin-players-select-cell">
                <input
                  type="checkbox"
                  checked={
                    visiblePlayers.some((player) => isRowSelectable(player)) &&
                    visiblePlayers
                      .filter((player) => isRowSelectable(player))
                      .every((player) => selectedIds.has(player.id))
                  }
                  onChange={() => onToggleSelectAll?.(visiblePlayers)}
                  aria-label={t.localImport?.selectReady || t.actions.edit}
                />
              </span>
            )}
            <SortableHeader
              label={t.table.nickname}
              field="nickname"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.alliance}
              field="alliance"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.troops}
              field="troopType"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.tier}
              field="tier"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.lair}
              field="lairLevel"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.march}
              field="marchSize"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.rally}
              field="rallySize"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.shift}
              field="shift"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.captain}
              field="captain"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label={t.table.ready}
              field="readyAttack"
              sort={sort}
              onSort={handleSort}
            />
            <span className="admin-players-actions-heading">{t.table.actions}</span>
          </div>

          <div className="admin-players-table__body">
            {visiblePlayers.map((player) => (
              <PlayersTableRow
                key={player.id}
                player={player}
                t={t}
                language={language}
                registrationSettings={registrationSettings}
                selectable={selectable}
                selectedIds={selectedIds}
                onToggleSelected={onToggleSelected}
                isRowSelectable={isRowSelectable}
                getRowStatus={getRowStatus}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </div>

      {pageSize !== "all" && totalPages > 1 && (
        <nav className="admin-players-pagination" aria-label={t.pagination.label}>
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label={t.pagination.previous}
            title={t.pagination.previous}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <span>
            {t.pagination.pageOf
              .replace("{{page}}", String(page))
              .replace("{{pages}}", String(totalPages))}
          </span>

          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label={t.pagination.next}
            title={t.pagination.next}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </nav>
      )}
    </>
  );
}

export default PlayersTable;
