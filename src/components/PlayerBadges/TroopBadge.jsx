import "./TroopBadge.css";

function TroopBadge({ type, label, compact = false }) {
  const normalizedType = String(type || "").toLowerCase();

  return (
    <span
      className={`player-troop-badge player-troop-badge--${normalizedType} ${compact ? "player-troop-badge--compact" : ""}`.trim()}
    >
      <span className="player-troop-badge__text">{label}</span>
    </span>
  );
}

export default TroopBadge;
