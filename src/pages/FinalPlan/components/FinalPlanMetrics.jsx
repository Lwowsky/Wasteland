import { formatMarch } from "../../../utils/formatMarch.js";
import { getFinalPlanMetrics } from "../../../features/turrets/finalPlanMetrics.js";

export function PlanLegend({ t }) {
  return (
    <div className="final-plan-legend" aria-label={t.finalPlan.metrics.legend}>
      {(["capacity", "used", "remaining"]).map((key) => (
        <span key={key} className="final-plan-legend__item">
          <i className={`final-plan-legend__swatch final-plan-legend__swatch--${key}`} aria-hidden="true" />
          {t.finalPlan.metrics[key]}
        </span>
      ))}
    </div>
  );
}

export default function FinalPlanMetrics({ t, data, language }) {
  const metrics = getFinalPlanMetrics(data);
  return (
    <div className="final-plan-tower__stats">
      {(["capacity", "used", "remaining"]).map((key) => {
        const label = t.finalPlan.metrics[key];
        const value = metrics[key];
        const formatted = value === null ? "—" : formatMarch(value, language);
        return (
          <span key={key}
            className={`final-plan-tower__stat final-plan-tower__stat--${key}`}
            title={`${label}: ${formatted}${value === null ? ` (${t.finalPlan.metrics.unavailable})` : ""}`}
            aria-label={`${label}: ${formatted}`}>
            {formatted}
          </span>
        );
      })}
    </div>
  );
}
