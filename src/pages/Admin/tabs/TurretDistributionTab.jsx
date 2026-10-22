import { useState } from "react";
import { isCaptureRegionEnabled } from "../../../../shared/captureRegions.js";
import TurretDistributionCycle from "../turrets/TurretDistributionCycle.jsx";
import "../turrets/TurretDistribution.css";
import "../turrets/TurretDistributionHeader.css";

function TurretDistributionTab({ t, language, publicT, players, period, loading, error, onReload, editable, canPublish, registrationSettings, registrationSettingsReady, registrationSettingsError, onReloadRegistrationSettings, userId }) {
  const [region, setRegion] = useState("home");
  const periodId = period?.id ?? null;
  const labels = {
    home: t.distribution.regionPicker.home,
    region2: t.registration.wastelandModal.captureRegion1,
    region3: t.registration.wastelandModal.captureRegion2,
  };
  const regions = ["home", "region2", "region3"];
  const available = regions.filter((id) => isCaptureRegionEnabled(registrationSettings, id));
  const active = available.includes(region) ? region : "home";
  return <section className="admin-section turret-distribution-section">
    <div className="capture-region-picker" role="group" aria-label={t.distribution.regionPicker.label}>
      {available.map((id) => <button key={id} type="button"
        className={`admin-secondary-button${id === active ? " capture-region-picker__active" : ""}`}
        aria-pressed={id === active} onClick={() => setRegion(id)}>{labels[id]}</button>)}
    </div>
    <TurretDistributionCycle key={`${periodId || "no-period"}:${active}`} region={active}
      t={t} language={language} publicT={publicT} players={players} periodId={periodId}
      loading={loading} error={error} onReload={onReload}
      registrationSettings={registrationSettings} registrationSettingsReady={registrationSettingsReady}
      registrationSettingsError={registrationSettingsError} onReloadRegistrationSettings={onReloadRegistrationSettings}
      editable={editable} canPublish={canPublish} userId={userId} />
  </section>;
}
export default TurretDistributionTab;
