import { forwardRef } from "react";

import FinalPlanTower from "./FinalPlanTower.jsx";

const TOWERS = ["hub", "north", "west", "east", "south"];

const FinalPlanBoard = forwardRef(function FinalPlanBoard(
  { t, activeShift, plan },
  ref,
) {
  const shiftLabel =
    activeShift === "shift1" ? t.finalPlan.shift1 : t.finalPlan.shift2;

  const halfLabel =
    activeShift === "shift1" ? t.finalPlan.firstHalf : t.finalPlan.secondHalf;

  return (
    <div className="final-plan-board" ref={ref}>
      <h2 className="final-plan-board__title">
        {shiftLabel}
        {" • "}
        {halfLabel}
      </h2>

      <div className="final-plan-towers">
        {TOWERS.map((towerId) => (
          <FinalPlanTower
            key={towerId}
            t={t}
            towerId={towerId}
            data={plan[towerId]}
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
