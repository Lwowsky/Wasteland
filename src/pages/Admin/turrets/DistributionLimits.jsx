import FlexibleShiftSettings from "./FlexibleShiftSettings.jsx";
import TierMarchSettings from "./TierMarchSettings.jsx";
import GlobalHelperLimit from "./GlobalHelperLimit.jsx";

import "./DistributionLimits.css";

function DistributionLimits(props) {
  return (
    <div className="planner-limit-panels">
      <FlexibleShiftSettings {...props} />
      <div className="planner-limits-side">
        <GlobalHelperLimit {...props} />
        <TierMarchSettings {...props} />
      </div>
    </div>
  );
}

export default DistributionLimits;
