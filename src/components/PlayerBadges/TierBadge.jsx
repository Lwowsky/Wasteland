import "./TierBadge.css";

function getTierNumber(tier) {
  const value = Number(String(tier || "").replace(/\D/g, ""));

  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(14, Math.max(1, value));
}

function TierBadge({ tier, compact = false }) {
  const tierNumber = getTierNumber(tier);

  return (
    <span
      className={`player-tier-badge player-tier-badge--t${tierNumber} ${compact ? "player-tier-badge--compact" : ""}`.trim()}
      title={`T${tierNumber}`}
    >
      <span className="player-tier-badge__text">T{tierNumber}</span>
    </span>
  );
}

export default TierBadge;
