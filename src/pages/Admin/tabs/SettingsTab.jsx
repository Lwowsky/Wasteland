import {
  AlertTriangle,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
} from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";

import {
  exportAdminWorkbook,
  getExportFieldDefinitions,
} from "../utils/exportExcel.js";
import PlayerImportPanel from "../settings/PlayerImportPanel.jsx";
import RegionBackupPanel from "../settings/RegionBackupPanel.jsx";
import ContentAccessPanel from "../settings/ContentAccessPanel.jsx";
import SiteIdentityPanel from "../settings/SiteIdentityPanel.jsx";

import "./SettingsTab.css";

const ExportSettingsModal = lazy(() =>
  import("../settings/ExportSettingsModal.jsx"),
);
const FactoryResetModal = lazy(() =>
  import("../settings/FactoryResetModal.jsx"),
);

function SettingsTab({
  t,
  players,
  currentAdmin,
  registrationSettings,
  currentPeriod,
  language,
  onFactoryResetCompleted,
  onPlayersImported,
}) {
  const s = t.settings;
  const [fileName, setFileName] = useState("wasteland-players");
  const [resetOpen, setResetOpen] = useState(false);
  const [exportSettingsOpen, setExportSettingsOpen] = useState(false);

  const isOwner = currentAdmin?.role === "owner";

  const exportLabels = useMemo(
    () => ({
      yes: t.common.yes,
      no: t.common.no,
      troops: t.players.troops,
      shifts: t.players.shifts,
      sheets: s.export.excelLabels.sheets,
      columns: s.export.excelLabels.columns,
    }),
    [s.export.excelLabels.columns, s.export.excelLabels.sheets, t.common.no, t.common.yes, t.players.shifts, t.players.troops],
  );

  const exportFields = useMemo(
    () =>
      getExportFieldDefinitions({
        labels: exportLabels,
        registrationSettings,
        players,
      }),
    [exportLabels, registrationSettings, players],
  );

  const [selectedExportFields, setSelectedExportFields] = useState(() =>
    Object.fromEntries(exportFields.map((field) => [field.id, true])),
  );


  async function exportExcel() {
    await exportAdminWorkbook({
      fileName,
      players,
      selectedFields: Object.fromEntries(
        exportFields.map((field) => [field.id, selectedExportFields[field.id] !== false]),
      ),
      fields: exportFields,
      labels: exportLabels,
    });
  }

  const exportSelectedCount = exportFields.filter(
    (field) => selectedExportFields[field.id] !== false,
  ).length;

  return (
    <section className="admin-section admin-system-settings">
      <div className="admin-section__head">
        <div>
          <h2>{s.title}</h2>
          <p>{s.description}</p>
        </div>
      </div>

      <SiteIdentityPanel t={s.siteIdentity} isOwner={isOwner} />

      <div className="settings-tools-grid">
        <PlayerImportPanel
          t={s.import}
          players={players}
          registrationSettings={registrationSettings}
          currentPeriod={currentPeriod}
          onImported={onPlayersImported}
        />

        <article className="settings-tool-card settings-export-card settings-export-card--compact">
          <div className="admin-export-compact">
            <div className="admin-export-compact__intro">
              <div className="admin-export-icon">
                <FileSpreadsheet size={34} />
              </div>
              <div>
                <h3>{s.export.title}</h3>
                <p>{s.export.description}</p>
                <span>
                  {s.export.selectedSummary.replace("{{count}}", exportSelectedCount)}
                </span>
              </div>
            </div>

            <div className="admin-export-compact__controls">
              <label className="admin-field">
                <span>{s.export.fileName}</span>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                />
              </label>

              <div className="admin-export-compact__buttons">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => setExportSettingsOpen(true)}
                >
                  <SlidersHorizontal size={17} />
                  {s.export.settingsButton}
                </button>

                <button
                  type="button"
                  className="admin-primary-button admin-export-button"
                  onClick={exportExcel}
                  disabled={exportSelectedCount === 0}
                >
                  <Download size={18} />
                  {s.export.download}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="settings-tools-grid">
        {isOwner ? (
          <RegionBackupPanel
            t={s.backup}
            onRestored={() =>
              onFactoryResetCompleted?.({ clearBrowserData: false })
            }
          />
        ) : (
          <article className="settings-tool-card">
            <div className="admin-export-icon">
              <DatabaseBackup size={30} />
            </div>
            <h3>{s.backup.title}</h3>
            <p>{s.backup.ownerOnly}</p>
          </article>
        )}

        <ContentAccessPanel t={s.access} language={language} />
      </div>

      {isOwner && (
        <section className="settings-danger-zone">
          <div className="settings-danger-zone__icon" aria-hidden="true">
            <AlertTriangle size={28} />
          </div>

          <div className="settings-danger-zone__content">
            <div>
              <span className="settings-danger-zone__eyebrow">
                {s.factoryReset.eyebrow}
              </span>
              <h3>{s.factoryReset.title}</h3>
              <p>{s.factoryReset.description}</p>
              <strong className="settings-danger-zone__preserved">
                {s.factoryReset.preservedSummary}
              </strong>
            </div>

            <button
              type="button"
              className="settings-danger-zone__button"
              onClick={() => setResetOpen(true)}
            >
              <AlertTriangle size={18} aria-hidden="true" />
              {s.factoryReset.open}
            </button>
          </div>
        </section>
      )}

      <Suspense fallback={null}>
        {exportSettingsOpen && (
          <ExportSettingsModal
            open
            onClose={() => setExportSettingsOpen(false)}
            t={s.export.modal}
            fields={exportFields}
            selected={selectedExportFields}
            onChange={setSelectedExportFields}
          />
        )}

        {resetOpen && (
          <FactoryResetModal
            open
            onClose={() => setResetOpen(false)}
            t={s.factoryReset}
            onCompleted={onFactoryResetCompleted}
          />
        )}
      </Suspense>
    </section>
  );
}

export default SettingsTab;
