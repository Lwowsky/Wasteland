import { publicAsset } from "../../../utils/publicAsset.js";

import { formatMarch } from "../../../utils/formatMarch.js";
import TierBadge from "../../../components/PlayerBadges/TierBadge.jsx";
import { comparePlayersByTier } from "../../../features/turrets/tierPriority.js";

/** Displays assigned players. All add-player controls live in TurretManualAdd. */
function TurretHelperEditor({ a, language, shift, tower, assignments, players, disabled, onEdit }) {
  const slot = assignments.shifts[shift][tower];
  const roster = new Map(players.map((player) => [String(player.id), player]));
  // Visual order only; assignments stay unchanged.
  const rankedHelpers = slot.helperIds.map((id) => roster.get(id)).filter(Boolean)
    .sort((left, right) => comparePlayersByTier(left, right,
      (player) => slot.helperMarches[String(player.id)] || 0));
  const displayIds = [slot.captainId, ...rankedHelpers.map((player) => String(player.id))].filter(Boolean);

  return (
    <div className="turret-assigned-card">
      <div className="turret-assigned-card__head">
        <h4>{a.distribution.turret.playersInTurret}</h4>
        <span>{a.distribution.turret.captainAndPlayers}</span>
      </div>
      <div className="turret-assigned-table turret-assigned-table--head turret-assigned-table--actions">
        <span>{a.distribution.columns.player}</span><span>{a.distribution.columns.alliance}</span>
        <span>{a.distribution.columns.role}</span><span>{a.distribution.columns.tier}</span>
        <span>{a.distribution.columns.march}</span><span>{a.distribution.columns.actions}</span>
      </div>
      {displayIds.map((id) => {
        const player = roster.get(id);
        if (!player) return null;
        const captain = id === slot.captainId;
        return (
          <div className={`turret-assigned-table turret-assigned-table--actions${captain ? " turret-assigned-table--captain" : ""}`} key={id}>
            <strong title={player.nickname}>{player.nickname}</strong><span>{player.alliance || "—"}</span>
            <span className={captain ? "turret-captain-role" : "turret-helper-role"}>
              {captain ? a.distribution.turret.captain : a.distribution.manual.helper}
            </span>
            <span>{player.tier ? <TierBadge tier={player.tier} compact /> : "—"}</span>
            <span className="turret-assigned-march">{formatMarch(captain ? player.marchSize : slot.helperMarches[id], language)}</span>
            <button type="button" className="admin-secondary-button turret-assigned-edit"
              aria-label={`${a.distribution.towerEditor.editTitle}: ${player.nickname}`}
              title={a.distribution.towerEditor.editTitle} disabled={disabled}
              onClick={() => onEdit(id)}>
              <img src={publicAsset("/images/admin/icons/actions/edit.webp")} alt="" aria-hidden="true" />
            </button>
          </div>
        );
      })}
      {!slot.captainId && <p className="turret-empty-players">{a.distribution.final.noPlayers}</p>}
    </div>
  );
}

export default TurretHelperEditor;
