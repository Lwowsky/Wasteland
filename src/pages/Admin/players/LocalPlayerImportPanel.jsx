import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Trash2,
  Upload,
} from "lucide-react";

function LocalPlayerImportPanel({
  labels,
  databaseCount,
  viewMode,
  draft,
  draftCount,
  readyCount,
  problemCount,
  importedCount,
  selectedReadyCount,
  canTransfer,
  busy,
  message,
  error,
  onViewModeChange,
  onTransferSelected,
  onTransferAll,
  onClearImported,
  onClearAll,
}) {
  if (!draft) {
    return null;
  }

  return (
    <>
      <div
        className="admin-players-source-tabs"
        role="tablist"
        aria-label={labels.tabsLabel}
      >
        <button
          type="button"
          className={viewMode === "d1" ? "is-active" : ""}
          onClick={() => onViewModeChange("d1")}
          role="tab"
          aria-selected={viewMode === "d1"}
        >
          <Database size={17} aria-hidden="true" />
          {labels.databaseTab.replace("{{count}}", String(databaseCount))}
        </button>
        <button
          type="button"
          className={viewMode === "local" ? "is-active" : ""}
          onClick={() => onViewModeChange("local")}
          role="tab"
          aria-selected={viewMode === "local"}
        >
          <HardDrive size={17} aria-hidden="true" />
          {labels.localTab.replace("{{count}}", String(draftCount))}
        </button>
      </div>

      {viewMode === "local" && (
        <div className="admin-local-import-toolbar">
          <div className="admin-local-import__summary">
            <div>
              <HardDrive size={22} aria-hidden="true" />
              <span>
                <strong>{labels.title}</strong>
                <small>
                  {labels.fileSummary
                    .replace("{{file}}", draft.fileData?.fileName || "—")
                    .replace("{{count}}", String(draftCount))}
                </small>
              </span>
            </div>

            <div className="admin-local-import__counters">
              <span className="is-ready">
                <CheckCircle2 size={15} /> {labels.ready}: {readyCount}
              </span>
              <span className="is-problem">
                <AlertTriangle size={15} /> {labels.problems}: {problemCount}
              </span>
              <span className="is-imported">
                <Database size={15} /> {labels.imported}: {importedCount}
              </span>
            </div>
          </div>

          <div className="admin-local-import__guide">
            <strong>{labels.guideTitle}</strong>
            <span>{labels.guideText}</span>
          </div>

          <div className="admin-local-import__actions">
            {canTransfer && (
              <>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={onTransferSelected}
                  disabled={!selectedReadyCount || busy}
                >
                  <Upload size={16} aria-hidden="true" />
                  {labels.transferSelected.replace(
                    "{{count}}",
                    String(selectedReadyCount),
                  )}
                </button>
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={onTransferAll}
                  disabled={!readyCount || busy}
                >
                  <Database size={16} aria-hidden="true" />
                  {busy
                    ? labels.transferring
                    : labels.transferAll.replace(
                        "{{count}}",
                        String(readyCount),
                      )}
                </button>
              </>
            )}

            {importedCount > 0 && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={onClearImported}
              >
                {labels.clearImported}
              </button>
            )}

            <button
              type="button"
              className="admin-local-import__clear"
              onClick={onClearAll}
            >
              <Trash2 size={16} aria-hidden="true" /> {labels.clearAll}
            </button>
          </div>

          {message && (
            <div className="admin-local-import__message is-success">
              {message}
            </div>
          )}
          {error && (
            <div className="admin-local-import__message is-error">{error}</div>
          )}
          {!canTransfer && (
            <div className="admin-local-import__message">
              {labels.ownerAdminOnly}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default LocalPlayerImportPanel;
