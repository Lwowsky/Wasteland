import { publicAsset } from "../../../utils/publicAsset.js";

import { lazy, Suspense, useMemo, useState } from "react";
import { hasPermission, PERMISSIONS } from "../../../features/auth/permissions.js";

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

const SETTINGS_TAB_ICONS = {
  export: publicAsset("/images/admin/icons/settings/players-export.webp"),
  reset: publicAsset("/images/admin/icons/settings/data-reset.webp"),
};

const BUTTON_ICONS = {
  settings: publicAsset("/images/admin/icons/settings.webp"),
  export: publicAsset("/images/admin/icons/settings/players-export.webp"),
};

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

  const can = (permission) => hasPermission(currentAdmin?.role, permission, currentAdmin?.permissions);
  const isOwner = currentAdmin?.role === "owner";
  const canAppearance = can(PERMISSIONS.MANAGE_SITE_APPEARANCE);
  const canBackup = can(PERMISSIONS.MANAGE_REGION_BACKUP);
  const canContentAccess = can(PERMISSIONS.MANAGE_CONTENT_ACCESS);
  const canImport = can(PERMISSIONS.IMPORT_PLAYERS);

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

      {canAppearance && <SiteIdentityPanel t={s.siteIdentity} isOwner={canAppearance} />}

      <div className="settings-tools-grid">
        {canImport && <PlayerImportPanel
          t={s.import}
          players={players}
          registrationSettings={registrationSettings}
          currentPeriod={currentPeriod}
          onImported={onPlayersImported}
        />}

        <article className="settings-tool-card settings-export-card settings-export-card--compact">
          <div className="admin-export-compact">
            <div className="admin-export-compact__intro">
              <div className="admin-export-icon" aria-hidden="true">
                <img
                  className="settings-section-icon"
                  src={SETTINGS_TAB_ICONS.export}
                  alt=""
                />
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
                  <img
                    className="settings-button-icon-image"
                    src={BUTTON_ICONS.settings}
                    alt=""
                    aria-hidden="true"
                  />
                  {s.export.settingsButton}
                </button>

                <button
                  type="button"
                  className="admin-primary-button admin-export-button"
                  onClick={exportExcel}
                  disabled={exportSelectedCount === 0}
                >
                  <img
                    className="settings-button-icon-image"
                    src={BUTTON_ICONS.export}
                    alt=""
                    aria-hidden="true"
                  />
                  {s.export.download}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="settings-tools-grid">
        {canBackup && (
          <RegionBackupPanel
            t={s.backup}
            onRestored={() =>
              onFactoryResetCompleted?.({ clearBrowserData: false })
            }
          />
        )}

        {canContentAccess && <ContentAccessPanel t={s.access} sharedConsulT={isOwner ? s.sharedConsul : null} cancelLabel={s.sharedConsul.cancel} language={language} />}
      </div>

      {isOwner && (
        <section className="settings-danger-zone">
          <div className="settings-danger-zone__icon" aria-hidden="true">
            <img
              className="settings-section-icon"
              src={SETTINGS_TAB_ICONS.reset}
              alt=""
            />
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
              <img
                className="settings-button-icon-image"
                src={SETTINGS_TAB_ICONS.reset}
                alt=""
                aria-hidden="true"
              />
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
