import { Users } from "lucide-react";

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return new Intl.NumberFormat("en-US").format(number);
}

function PlayerRow({ player, captain = false }) {
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
        {formatNumber(player.marchSize)}
      </span>
    </div>
  );
}

function FinalPlanTower({ t, towerId, data }) {
  const players = data?.players || [];

  const captain = data?.captain || null;

  const troopType = data?.troopType || null;

  const totalPlayers = players.length + (captain ? 1 : 0);

  const regularPlayers = players.length;

  const captainCount = captain ? 1 : 0;

  const troopLabel = troopType
    ? t.finalPlan.troops?.[troopType] || troopType
    : t.finalPlan.typeByCaptain;

  return (
    <article className="final-plan-tower">
      <header className="final-plan-tower__header">
        <h3>{t.finalPlan.towers[towerId]}</h3>

        <div className="final-plan-tower__troop">{troopLabel}</div>

        <div className="final-plan-tower__stats">
          <span className="final-plan-tower__stat final-plan-tower__stat--blue">
            <Users size={14} />

            {totalPlayers}
          </span>

          <span className="final-plan-tower__stat final-plan-tower__stat--green">
            <Users size={14} />

            {regularPlayers}
          </span>

          <span className="final-plan-tower__stat final-plan-tower__stat--gold">
            <Users size={14} />

            {captainCount}
          </span>
        </div>
      </header>

      <div className="final-plan-tower__columns">
        <span>{t.finalPlan.columns.nickname}</span>

        <span>{t.finalPlan.columns.alliance}</span>

        <span>{t.finalPlan.columns.tier}</span>

        <span>{t.finalPlan.columns.march}</span>
      </div>

      <div className="final-plan-tower__players">
        {!captain && players.length === 0 ? (
          <div className="final-plan-empty">
            <Users size={36} />

            <span>{t.finalPlan.noPlayers}</span>
          </div>
        ) : (
          <>
            {captain && <PlayerRow player={captain} captain />}

            {players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </>
        )}
      </div>
    </article>
  );
}

export default FinalPlanTower;
