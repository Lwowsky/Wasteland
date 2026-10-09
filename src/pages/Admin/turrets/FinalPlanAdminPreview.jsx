import { TURRET_IDS } from "../data/mockTurretDistribution.js";

function FinalPlanAdminPreview({ a, turrets, players }) {
  const shift = "shift1";
  return (
    <div className="turret-final-preview">
      <div className="turret-final-toolbar">
        <button className="admin-primary-button" type="button">{a.shifts.shift1}</button>
        <button className="admin-secondary-button" type="button">{a.shifts.shift2}</button>
        <button className="admin-secondary-button" type="button">{a.distribution.final.language}</button>
        <button className="admin-secondary-button" type="button">{a.distribution.final.publish}</button>
      </div>
      <div className="turret-final-board">
        <h3>{a.shifts.shift1} • {a.distribution.final.firstHalf}</h3>
        <div className="turret-final-columns">
          {TURRET_IDS.map((id) => {
            const turret = turrets[shift][id];
            const captain = players.find((p) => p.id === turret.captainId);
            return (
              <article key={id} className={captain ? "turret-final-column turret-final-column--active" : "turret-final-column"}>
                <header><strong>{a.distribution.towers[id]}</strong><span>{captain ? a.troops[captain.troopType] : a.distribution.turret.typeByCaptain}</span><div><b>{captain ? captain.marchSize.toLocaleString("en-US") : 0}</b><b>{captain ? captain.rallySize.toLocaleString("en-US") : 0}</b><b>{captain ? captain.marchSize.toLocaleString("en-US") : 0}</b></div></header>
                {captain ? <div className="turret-final-player"><strong>{captain.nickname}</strong><span>{captain.alliance}</span><span>{captain.tier}</span><span>{captain.marchSize.toLocaleString("en-US")}</span></div> : <p>{a.distribution.final.noPlayers}</p>}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FinalPlanAdminPreview;
