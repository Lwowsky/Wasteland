import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo } from "react";

import StatusBadge from "../../../components/PlayerBadges/StatusBadge.jsx";
import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../../components/PlayerBadges/TroopBadge.jsx";
import { getPlayerRuleIssues } from "./playerRuleIssues.js";
import { getTotalPages, getVisiblePlayers } from "../../../features/players/playerPagination.js";

import "../styles/players/PlayersTable.css";

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase();
}

function getSortValue(player, field) {
  switch (field) {
    case "nickname":
      return normalizeText(player.nickname);
    case "alliance":
      return normalizeText(player.alliance);
    case "troopType":
      return normalizeText(player.troopType);
    case "tier":
      return Number(String(player.tier ?? "").replace(/\D/g, "") || 0);
    case "lairLevel":
      return Number(player.lairLevel ?? 0);
    case "marchSize":
      return Number(player.marchSize ?? 0);
    case "rallySize":
      return Number(player.rallySize ?? 0);
    case "shift":
      return normalizeText(player.shift);
    case "captain":
      return player.captain ? 1 : 0;
    case "readyAttack":
      return player.readyAttack ? 1 : 0;
    default:
      return "";
  }
}

function formatNumber(value, language) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return Number(value).toLocaleString(language === "uk" ? "uk-UA" : "en-GB");
}

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

function getIssueText(issue, t) {
  if (issue.type === "tier") {
    return t.ruleStatus.tierUnavailable.replace("{{tier}}", issue.value);
  }

  return t.ruleStatus.shiftUnavailable.replace(
    "{{shift}}",
    t.shifts[issue.value] || issue.value,
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
  const sortedPlayers = useMemo(() => {
    if (!sort.field) {
      return players;
    }

    return [...players].sort((a, b) => {
      const first = getSortValue(a, sort.field);
      const second = getSortValue(b, sort.field);
      const result =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : String(first).localeCompare(
              String(second),
              language === "uk" ? "uk" : "en",
            );

      return sort.direction === "asc" ? result : -result;
    });
  }, [players, sort, language]);

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
            {visiblePlayers.map((player) => {
              const issues = getPlayerRuleIssues(player, registrationSettings);
              const issueTitle = issues
                .map((issue) => getIssueText(issue, t))
                .join("\n");
              const sourceStatus = getRowStatus?.(player) || null;
              const sourceStatusTitle = sourceStatus?.label || "";

              return (
                <div
                  key={player.id}
                  className={`admin-players-table__row ${issues.length ? "admin-players-table__row--attention" : ""}`}
                >
                  {selectable && (
                    <span className="admin-players-select-cell">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(player.id)}
                        disabled={!isRowSelectable(player)}
                        onChange={() => onToggleSelected?.(player)}
                        aria-label={player.nickname || ""}
                      />
                    </span>
                  )}

                  <span className="admin-player-nickname-wrap">
                    <strong
                      className={`admin-player-nickname ${
                        issues.length ? "admin-player-nickname--attention" : ""
                      } ${
                        sourceStatus?.variant
                          ? `admin-player-nickname--source-${sourceStatus.variant}`
                          : ""
                      }`}
                      title={
                        [player.nickname || "", sourceStatusTitle, issueTitle]
                          .filter(Boolean)
                          .join("\n")
                      }
                    >
                      {player.nickname || "—"}
                    </strong>

                    {issues.length > 0 && (
                      <span
                        className="admin-player-rule-warning"
                        title={issueTitle}
                        aria-label={issueTitle}
                      >
                        <AlertTriangle size={15} aria-hidden="true" />
                        <span>{issues.length}</span>
                      </span>
                    )}
                  </span>

                  <span className="admin-player-table-cell">
                    <span
                      className="admin-player-pill admin-player-pill--alliance"
                      title={player.alliance || ""}
                    >
                      {player.alliance || "—"}
                    </span>
                  </span>

                  <span className="admin-player-table-cell">
                    <TroopBadge
                      type={player.troopType}
                      label={player.troopType ? t.troops[player.troopType] : "—"}
                    />
                  </span>

                  <span className="admin-player-table-cell">
                    <TierBadge tier={player.tier} />
                  </span>

                  <span className="admin-player-table-text">
                    {player.lairLevel ?? "—"}
                  </span>
                  <span className="admin-player-table-text admin-player-number">
                    {formatNumber(player.marchSize, language)}
                  </span>
                  <span className="admin-player-table-text admin-player-number">
                    {formatNumber(player.rallySize, language)}
                  </span>

                  <span className="admin-player-table-cell">
                    <StatusBadge type="shift" value={player.shift} t={t} />
                  </span>
                  <span className="admin-player-table-cell">
                    <StatusBadge type="captain" value={player.captain} t={t} />
                  </span>
                  <span className="admin-player-table-cell">
                    <StatusBadge type="ready" value={player.readyAttack} t={t} />
                  </span>

                  <span className="admin-player-actions">
                    {canEdit && (
                      <button
                        type="button"
                        className="admin-player-action admin-player-action--edit"
                        onClick={() => onEdit(player)}
                        aria-label={t.actions.edit}
                        title={t.actions.edit}
                      >
                        <img
                          src="/images/admin/icons/actions/edit.webp"
                          alt=""
                          aria-hidden="true"
                          className="admin-player-action__image"
                        />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        className="admin-player-action admin-player-action--delete"
                        onClick={() => onDelete(player)}
                        aria-label={t.actions.delete}
                        title={t.actions.delete}
                      >
                        <img
                          src="/images/admin/icons/actions/delete.webp"
                          alt=""
                          aria-hidden="true"
                          className="admin-player-action__image"
                        />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
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
