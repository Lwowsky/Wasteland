import { publicAsset } from "../../../utils/publicAsset.js";
import { AlertTriangle } from "lucide-react";

import StatusBadge from "../../../components/PlayerBadges/StatusBadge.jsx";
import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";
import TroopBadge from "../../../components/PlayerBadges/TroopBadge.jsx";
import { getPlayerRuleIssues } from "./playerRuleIssues.js";

function formatNumber(value, language) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return Number(value).toLocaleString(language === "uk" ? "uk-UA" : "en-GB");
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

export default function PlayersTableRow({
  player,
  t,
  language,
  registrationSettings,
  selectable,
  selectedIds,
  onToggleSelected,
  isRowSelectable,
  getRowStatus,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  const issues = getPlayerRuleIssues(player, registrationSettings);
  const issueTitle = issues.map((issue) => getIssueText(issue, t)).join("\n");
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
              src={publicAsset("/images/admin/icons/actions/edit.webp")}
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
              src={publicAsset("/images/admin/icons/actions/delete.webp")}
              alt=""
              aria-hidden="true"
              className="admin-player-action__image"
            />
          </button>
        )}
      </span>
    </div>
  );
}
