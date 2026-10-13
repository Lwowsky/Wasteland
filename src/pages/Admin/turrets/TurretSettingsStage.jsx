import { summarizePlannerPlayers } from "../../../features/turrets/plannerPlayers.js";
import DistributionSettings from "./DistributionSettings.jsx";

function TurretSettingsStage({ draft, players, assignments, hidden, onAuto, onClearHelpers,
  autoBlocked, redistributeBlocked, clearHelpersBlocked, registrations, registrationSettings,
  requestConfirm, ...props }) {
  return (
    <div hidden={hidden}>
      <DistributionSettings
        {...props}
        stats={summarizePlannerPlayers(players)}
        players={players}
        registrations={registrations}
        registrationSettings={registrationSettings}
        onApplyFlexible={draft.applyFlexible}
        onRestoreFlexible={draft.restoreFlexible}
        assignments={assignments}
        settings={draft.settings}
        setSettings={draft.setSettings}
        ready={draft.ready}
        onAuto={onAuto}
        onClearHelpers={onClearHelpers}
        autoBlocked={autoBlocked}
        redistributeBlocked={redistributeBlocked}
        clearHelpersBlocked={clearHelpersBlocked}
        requestConfirm={requestConfirm}
      />
    </div>
  );
}
export default TurretSettingsStage;
