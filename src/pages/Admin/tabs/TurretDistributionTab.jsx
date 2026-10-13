import TurretDistributionCycle from "../turrets/TurretDistributionCycle.jsx";
import "../turrets/TurretDistribution.css";
import "../turrets/TurretDistributionHeader.css";

function TurretDistributionTab({ t, language, publicT, players, period, loading, error, onReload, editable, canPublish, registrationSettings, registrationSettingsReady, registrationSettingsError, onReloadRegistrationSettings, userId }) {
  const periodId = period?.id ?? null;
  return (
    <section className="admin-section turret-distribution-section">
      <TurretDistributionCycle key={periodId || "no-period"} t={t} language={language} publicT={publicT}
        players={players} periodId={periodId} loading={loading} error={error}
        onReload={onReload} registrationSettings={registrationSettings}
        registrationSettingsReady={registrationSettingsReady} registrationSettingsError={registrationSettingsError}
        onReloadRegistrationSettings={onReloadRegistrationSettings} editable={editable} canPublish={canPublish} userId={userId} />
    </section>
  );
}
export default TurretDistributionTab;
