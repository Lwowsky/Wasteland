import { forwardRef } from "react";

import FinalPlanTower from "./FinalPlanTower.jsx";
import { PlanLegend } from "./FinalPlanMetrics.jsx";

import { TURRET_IDS } from "../../../features/turrets/plannerConstants.js";
import { getPlanShiftHeading } from "../data/finalPlanLanguages.js";

const FinalPlanBoard = forwardRef(function FinalPlanBoard(
  { t, activeShift, plan, language, languages },
  ref,
) {
  const shiftLabel = languages?.length ? getPlanShiftHeading(activeShift, languages) :
    (t.finalPlan[activeShift] || activeShift);

  return (
    <div className="final-plan-board" ref={ref}>
      <h2 className="final-plan-board__title">
        {shiftLabel}
      </h2>

      <PlanLegend t={t} />

      <div className="final-plan-towers">
        {TURRET_IDS.map((towerId) => (
          <FinalPlanTower
            key={towerId}
            t={t}
            language={language}
            towerId={towerId}
            data={plan?.[towerId]}
          />
        ))}
      </div>

      <div className="final-plan-signature">
        <img
          src="/images/final-plan/board-signature-flatflags.svg"
          alt={t.finalPlan.signatureAlt}
          onError={(event) => {
            event.currentTarget.onerror = null;

            event.currentTarget.src =
              "/images/final-plan/board-signature-flatflags.png";
          }}
        />
      </div>
    </div>
  );
});

export default FinalPlanBoard;
