import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  HardDrive,
} from "lucide-react";
import { lazy, Suspense, useMemo, useRef, useState } from "react";

import { importAdminRegistrations } from "../services/adminPlayersApi.js";
import {
  buildSuggestedMapping,
  readPlayersImportFile,
} from "../utils/importPlayers.js";
import {
  clearPlayerImportDraft,
  loadPlayerImportDraft,
  savePlayerImportDraft,
} from "../utils/localPlayerImportDraft.js";

import "./PlayerImportShared.css";
import "./PlayerImportPanel.css";

const PlayerImportMappingModal = lazy(() =>
  import("./PlayerImportMappingModal.jsx"),
);

const MAPPING_STORAGE_PREFIX = "wasteland-player-import-mapping:";
const PLAYERS_IMPORT_ICON = "/images/admin/icons/settings/players-import.webp";
const DELETE_ICON = "/images/admin/icons/actions/delete.webp";

function getMappingStorageKey(headers) {
  return `${MAPPING_STORAGE_PREFIX}${headers
    .map((header) => header.trim().toLowerCase())
    .join("|")}`;
}

function loadSavedMapping(headers) {
  try {
    const raw = localStorage.getItem(getMappingStorageKey(headers));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}


function PlayerImportPanel({
  t,
  players,
  registrationSettings,
  currentPeriod,
  onImported,
}) {
  const inputRef = useRef(null);
  const [fileData, setFileData] = useState(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(() => loadPlayerImportDraft());
  const [mappingSeed, setMappingSeed] = useState({
    mapping: {},
    manualFields: [],
    valueMappings: {},
  });

  const configuredCustomFields = useMemo(
    () => registrationSettings?.customFields || [],
    [registrationSettings?.customFields],
  );

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingFile(true);
    setError("");
    setResult(null);

    try {
      const nextFileData = await readPlayersImportFile(file);
      const saved = loadSavedMapping(nextFileData.headers);
      const suggested = buildSuggestedMapping(
        nextFileData.headers,
        configuredCustomFields,
      );

      setFileData(nextFileData);
      setMappingSeed({
        mapping: saved?.mapping || suggested,
        manualFields: Array.isArray(saved?.manualFields)
          ? saved.manualFields
          : [],
        valueMappings:
          saved?.valueMappings && typeof saved.valueMappings === "object"
            ? saved.valueMappings
            : {},
      });
      setMappingModalOpen(true);
    } catch (nextError) {
      console.error("Read player import:", nextError);
      setError(
        nextError.message === "EMPTY_FILE"
          ? t.errors.emptyFile
          : t.errors.readFile,
      );
      setFileData(null);
    } finally {
      setLoadingFile(false);
      resetInput();
    }
  }

  function saveMapping(next) {
    if (!fileData) return;

    try {
      localStorage.setItem(
        getMappingStorageKey(fileData.headers),
        JSON.stringify(next),
      );
    } catch (storageError) {
      console.warn("Save import mapping:", storageError);
    }
  }

  function handleStage(payload) {
    const nextDraft = {
      fileData: payload.fileData,
      mapping: payload.mapping,
      manualFields: payload.manualFields,
      valueMappings: payload.valueMappings,
      savedAt: new Date().toISOString(),
      stagedRows: payload.preview.rows.map((row) => ({
        localId: `${Date.now()}-${row.rowNumber}`,
        rowNumber: row.rowNumber,
        player: row.player,
        imported: false,
      })),
      targetPeriodId: currentPeriod?.id ?? null,
      targetCycleKey: currentPeriod?.cycleKey ?? null,
      summary: {
        total: payload.preview.total,
        valid: payload.preview.valid,
        invalid: payload.preview.invalid,
        duplicates: payload.preview.duplicates,
      },
    };

    try {
      savePlayerImportDraft(nextDraft);
      setDraft(nextDraft);
      setResult({ draft: true, saved: nextDraft.summary.total });
      setMappingModalOpen(false);
      setFileData(null);
    } catch (storageError) {
      console.error("Save player import draft:", storageError);
      setError(t.errors.saveDraftFailed);
    }
  }

  function openDraft() {
    if (!draft?.fileData) return;
    setFileData(draft.fileData);
    setMappingSeed({
      mapping: draft.mapping || {},
      manualFields: draft.manualFields || [],
      valueMappings: draft.valueMappings || {},
    });
    setError("");
    setResult(null);
    setMappingModalOpen(true);
  }

  function clearDraft() {
    try {
      clearPlayerImportDraft();
    } catch (storageError) {
      console.warn("Clear player import draft:", storageError);
    }
    setDraft(null);
  }

  async function handleImport(playersToImport) {
    if (!playersToImport.length) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const response = await importAdminRegistrations(playersToImport);
      setResult(response);
      setMappingModalOpen(false);
      setFileData(null);
      clearDraft();
      await onImported?.();
    } catch (nextError) {
      console.error("Import players:", nextError);
      const code = String(nextError?.message || "").trim();
      setError(
        code
          ? `${t.errors.importFailed} (${code})`
          : t.errors.importFailed,
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <article className="settings-tool-card settings-import-card">
        <div className="admin-export-icon" aria-hidden="true">
          <img
            className="settings-section-icon"
            src={PLAYERS_IMPORT_ICON}
            alt=""
          />
        </div>

        <h3>{t.title}</h3>
        <p>{t.description}</p>

        <input
          ref={inputRef}
          className="settings-import-input"
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFile}
        />

        <button
          type="button"
          className="settings-import-dropzone"
          onClick={() => inputRef.current?.click()}
          disabled={loadingFile}
        >
          <FileSpreadsheet size={28} aria-hidden="true" />
          <strong>{loadingFile ? t.reading : t.chooseFile}</strong>
          <span>{t.formats}</span>
        </button>

        <p className="settings-import-mapping-note">{t.mapping.cardHint}</p>

        {draft && (
          <div className="settings-import-draft-card">
            <div>
              <HardDrive size={19} />
              <span>
                <strong>{t.draft.title}</strong>
                <small>
                  {t.draft.summary
                    .replace("{{file}}", draft.fileData?.fileName || "—")
                    .replace("{{count}}", draft.summary?.total || 0)}
                </small>
                <small className="settings-import-draft-help">{t.draft.help}</small>
              </span>
            </div>
            <div className="settings-import-draft-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={openDraft}
              >
                {t.draft.open}
              </button>
              <button
                type="button"
                className="settings-import-draft-delete"
                onClick={clearDraft}
                aria-label={t.draft.clear}
              >
                <img className="settings-import-draft-delete-icon" src={DELETE_ICON} alt="" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {fileData && !mappingModalOpen && (
          <button
            type="button"
            className="admin-secondary-button settings-import-reopen"
            onClick={() => setMappingModalOpen(true)}
          >
            {t.mapping.continueMapping}
          </button>
        )}

        {error && (
          <div className="settings-import-message settings-import-message--error">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {result && !result.draft && (
          <div className="settings-import-message settings-import-message--success">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{t.success.replace("{{count}}", result.imported || 0)}</span>
          </div>
        )}

        {result?.draft && (
          <div className="settings-import-message settings-import-message--success">
            <HardDrive size={18} aria-hidden="true" />
            <span>{t.draft.saved.replace("{{count}}", result.saved || 0)}</span>
          </div>
        )}
      </article>

      <Suspense fallback={null}>
        {fileData && mappingModalOpen && (
          <PlayerImportMappingModal
            open
            onClose={() => setMappingModalOpen(false)}
            t={t}
            fileData={fileData}
            players={players}
            registrationSettings={registrationSettings}
            initialMapping={mappingSeed.mapping}
            initialManualFields={mappingSeed.manualFields}
            initialValueMappings={mappingSeed.valueMappings}
            onImport={handleImport}
            onStage={handleStage}
            importing={importing}
            onSaveMapping={saveMapping}
          />
        )}
      </Suspense>
    </>
  );
}

export default PlayerImportPanel;
