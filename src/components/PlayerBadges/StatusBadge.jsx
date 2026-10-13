import "./StatusBadge.css";

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function getShiftVariant(value) {
  switch (value) {
    case "shift1":
      return "shift-1";
    case "shift2":
      return "shift-2";
    case "shift3":
      return "shift-3";
    case "shift4":
      return "shift-4";
    case "flexible":
      return "shift-flexible";
    default:
      return "shift-flexible";
  }
}

function StatusBadge({ type, value, t, compact = false }) {
  const compactClass = compact ? " player-status-badge--compact" : "";

  if (type === "shift") {
    return (
      <span
        className={`player-status-badge player-status-badge--${getShiftVariant(value)}${compactClass}`}
      >
        <span className="player-status-badge__text">
          {value ? t.shifts[value] || "—" : "—"}
        </span>
      </span>
    );
  }

  if (type === "captain" || type === "ready") {
    const active = normalizeBoolean(value);
    const variant = `${type}-${active ? "yes" : "no"}`;

    return (
      <span
        className={`player-status-badge player-status-badge--${variant}${compactClass}`}
      >
        <span className="player-status-badge__text">
          {active ? t.yes : t.no}
        </span>
      </span>
    );
  }

  return null;
}

export default StatusBadge;
