import { formatMarch } from "../../../utils/formatMarch.js";
import { comparePlayersByTier } from "../../../features/turrets/tierPriority.js";
import { Users } from "lucide-react";
import FinalPlanMetrics from "./FinalPlanMetrics.jsx";

function PlayerRow({ player, captain = false, language }) {
  return (
    <div
      className={
        captain
          ? "final-plan-player-row final-plan-player-row--captain"
          : "final-plan-player-row"
      }
    >
      <strong
        className="final-plan-player-row__nickname"
        title={player.nickname}
      >
        {player.nickname}
      </strong>

      <span className="final-plan-player-row__alliance" title={player.alliance}>
        {player.alliance || "—"}
      </span>

      <span className="final-plan-player-row__tier">{player.tier || "—"}</span>

      <span className="final-plan-player-row__march">
        {formatMarch(player.marchSize, language)}
      </span>
    </div>
  );
}

function FinalPlanTower({ t, towerId, data, language }) {
  // Works with new snapshots and previously published snapshots alike.
  const players = [...(data?.players || [])].sort(comparePlayersByTier);

  const captain = data?.captain || null;

  const troopType = data?.troopType || null;

  const troopLabel = troopType
    ? t.finalPlan.troops?.[troopType] || troopType
    : t.finalPlan.typeByCaptain;

  const fallbackTroops = { hub: "fighter", north: "shooter", west: "rider", east: "fighter", south: "rider" };
  const visualTroop = ["fighter", "shooter", "rider"].includes(troopType)
    ? troopType : fallbackTroops[towerId];

  return (
    <article className={`final-plan-tower final-plan-tower--${visualTroop}`}>
      <header className="final-plan-tower__header">
        <h3>{t.finalPlan.towers[towerId]}</h3>

        <div className="final-plan-tower__troop">{troopLabel}</div>

        <FinalPlanMetrics t={t} language={language} data={data} />
      </header>

      <div className="final-plan-tower__players">
        {!captain && players.length === 0 ? (
          <div className="final-plan-empty">
            <Users size={36} />

            <span>{t.finalPlan.noPlayers}</span>
          </div>
        ) : (
          <>
            {captain && <PlayerRow language={language} player={captain} captain />}

            {players.map((player) => (
              <PlayerRow language={language} key={player.id} player={player} />
            ))}
          </>
        )}
      </div>
    </article>
  );
}

export default FinalPlanTower;
