import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { getImportIssueText } from "./playerImportMapping.js";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function replaceTokens(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{{${key}}}`, String(value)),
    String(template || ""),
  );
}

export default function PlayerImportPreview({ t, preview, destination }) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(
    1,
    pageSize === 0 ? 1 : Math.ceil(preview.rows.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);

  const visibleRows = useMemo(() => {
    if (pageSize === 0) {
      return preview.rows;
    }

    const start = (currentPage - 1) * pageSize;
    return preview.rows.slice(start, start + pageSize);
  }, [currentPage, pageSize, preview.rows]);

  const rangeStart = preview.total
    ? pageSize === 0
      ? 1
      : (currentPage - 1) * pageSize + 1
    : 0;
  const rangeEnd = preview.total
    ? pageSize === 0
      ? preview.total
      : Math.min(currentPage * pageSize, preview.total)
    : 0;

  function changePageSize(event) {
    const nextValue = event.target.value;
    setPageSize(nextValue === "all" ? 0 : Number(nextValue));
    setPage(1);
  }

  function changePage(nextPage) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  }

  return (
    <section className="settings-import-preview-section">
      <div className="settings-import-section-head">
        <div>
          <h3>{t.preview.title}</h3>
          <p>{t.mapping.previewText}</p>
        </div>
      </div>

      <div className="settings-import-stats">
        <span>
          <strong>{preview.total}</strong>
          {t.preview.total}
        </span>
        <span className="is-valid">
          <strong>{preview.valid}</strong>
          {t.preview.valid}
        </span>
        <span className={preview.invalid ? "is-error" : ""}>
          <strong>{preview.invalid}</strong>
          {t.preview.invalid}
        </span>
        <span className={preview.duplicates ? "is-warning" : ""}>
          <strong>{preview.duplicates}</strong>
          {t.preview.duplicates}
        </span>
      </div>

      {(preview.invalid > 0 || preview.duplicates > 0) && (
        <div className="settings-import-message settings-import-message--error">
          <AlertCircle size={18} />
          <span>
            {destination === "staging"
              ? t.destination.draftWithErrors
              : t.fixBeforeImport}
          </span>
        </div>
      )}

      {preview.invalid === 0 &&
        preview.duplicates === 0 &&
        preview.valid > 0 && (
          <div className="settings-import-message settings-import-message--success">
            <CheckCircle2 size={18} />
            <span>{t.mapping.ready.replace("{{count}}", preview.valid)}</span>
          </div>
        )}

      <div className="settings-import-preview-toolbar">
        <span className="settings-import-preview-range">
          {replaceTokens(t.preview.showing, {
            from: rangeStart,
            to: rangeEnd,
            total: preview.total,
          })}
        </span>

        <div className="settings-import-preview-controls">
          <label className="settings-import-page-size">
            <span>{t.preview.perPage}</span>
            <select value={pageSize === 0 ? "all" : pageSize} onChange={changePageSize}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
              <option value="all">{t.preview.all}</option>
            </select>
          </label>

          <div className="settings-import-pagination">
            <button
              type="button"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label={t.preview.previous}
              title={t.preview.previous}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>

            <span>
              {replaceTokens(t.preview.page, {
                page: currentPage,
                pages: totalPages,
              })}
            </span>

            <button
              type="button"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label={t.preview.next}
              title={t.preview.next}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="settings-import-preview-table-wrap">
        <table className="settings-import-preview-table">
          <thead>
            <tr>
              <th>{t.preview.rowShort}</th>
              <th>{t.fields.nickname}</th>
              <th>{t.fields.alliance}</th>
              <th>{t.fields.troopType}</th>
              <th>{t.fields.tier}</th>
              <th>{t.fields.shift}</th>
              <th>{t.mapping.status}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.rowNumber}
                className={row.valid ? "" : "is-invalid"}
              >
                <td>{row.rowNumber}</td>
                <td>{row.player.nickname || "—"}</td>
                <td>{row.player.alliance || "—"}</td>
                <td>{row.player.troopType || "—"}</td>
                <td>{row.player.tier || "—"}</td>
                <td>{row.player.shift || "—"}</td>
                <td>
                  {row.valid ? (
                    <span className="settings-import-status is-valid">
                      {t.mapping.ok}
                    </span>
                  ) : (
                    <span className="settings-import-status is-error">
                      {getImportIssueText(row, t)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
