import { useMemo, useState } from "react";

import TurretDistributionNav from "../turrets/TurretDistributionNav.jsx";
import DistributionSettings from "../turrets/DistributionSettings.jsx";
import TurretSettings from "../turrets/TurretSettings.jsx";
import PlayerStatus from "../turrets/PlayerStatus.jsx";
import FinalPlanAdminPreview from "../turrets/FinalPlanAdminPreview.jsx";

import {
  DEFAULT_TURRET_DISTRIBUTION_SETTINGS,
  MOCK_TURRET_PLAYERS,
  MOCK_TURRETS,
} from "../data/mockTurretDistribution.js";

import "../turrets/TurretDistribution.css";

function TurretDistributionTab({ t }) {
  const [section, setSection] = useState("settings");

  const [shift, setShift] = useState("shift1");

  const [settings, setSettings] = useState(
    DEFAULT_TURRET_DISTRIBUTION_SETTINGS,
  );

  const [players] = useState(MOCK_TURRET_PLAYERS);

  const [turrets] = useState(MOCK_TURRETS);

  const stats = useMemo(() => {
    const shift1 = players.filter(
      (player) => player.turretId && player.shift === "shift1",
    ).length;

    const shift2 = players.filter(
      (player) => player.turretId && player.shift === "shift2",
    ).length;

    const flexible = players.filter(
      (player) => player.turretId && player.shift === "flexible",
    ).length;

    const reserve = players.filter((player) => !player.turretId).length;

    return {
      shift1,
      shift2,
      flexible,
      total: players.length,
      reserve,
    };
  }, [players]);

  /*
   * Тимчасовий adapter для turret-компонентів.
   * Усі тексти вже приходять з нового i18n.
   *
   * Коли будемо переробляти саму логіку турелей,
   * тоді приберемо adapter і передамо t напряму.
   */
  const a = {
    distribution: t.distribution,

    troops: t.players.troops,

    shifts: t.players.shifts,
  };

  return (
    <section className="admin-section turret-distribution-section">
      <div className="admin-section__head">
        <div>
          <h2>{t.distribution.title}</h2>

          <p>{t.distribution.description}</p>
        </div>
      </div>

      <TurretDistributionNav
        labels={t.distribution.subtabs}
        active={section}
        onChange={setSection}
        ariaLabel={t.distribution.title}
      />

      <div className="turret-local-note">{t.distribution.localNote}</div>

      {section === "settings" && (
        <DistributionSettings
          a={a}
          settings={settings}
          setSettings={setSettings}
          stats={stats}
        />
      )}

      {section === "turrets" && (
        <TurretSettings
          a={a}
          shift={shift}
          setShift={setShift}
          turrets={turrets}
          players={players}
        />
      )}

      {section === "players" && <PlayerStatus a={a} players={players} />}

      {section === "final" && (
        <FinalPlanAdminPreview a={a} turrets={turrets} players={players} />
      )}
    </section>
  );
}

export default TurretDistributionTab;
