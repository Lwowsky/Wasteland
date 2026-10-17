import { Copy } from "lucide-react";
import { formatMediumDateTime } from "../../../utils/date.js";

export default function ContentAccessEditor({
  t,
  language,
  active,
  draft,
  generated,
  selectedResource,
  status,
  statusIcon,
  messageKey,
  errorKey,
  busy,
  icons,
  updateDraft,
  copyGenerated,
  save,
  generate,
  revoke,
  revokeOne,
}) {
  return (
    <div className="settings-access-body">
      {status && (
        <div className={`settings-access-status ${status.className}`}>
          <img className="settings-access-status-icon" src={statusIcon} alt="" aria-hidden="true" />
          <span>{status.label}</span>
          {active?.period?.cycleNumber && (
            <small>
              {t.cycle.replace("{{cycle}}", String(active.period.cycleNumber))}
            </small>
          )}
        </div>
      )}

      <label className="settings-access-field">
        <span>{t.modeLabel}</span>
        <select
          value={draft.mode}
          onChange={(event) => updateDraft("mode", event.target.value)}
        >
          <option value="public">{t.modes.public}</option>
          <option value="private">{t.modes.private}</option>
          {draft.mode === "code" && (
            <option value="code" disabled>{t.modes.code}</option>
          )}
          <option value="link">{t.modes.link}</option>
        </select>
      </label>

      {draft.mode === "code" && (
        <div className="settings-access-options">
          <label className="settings-access-field">
            <span>{t.useLimit.label}</span>
            <select
              value={draft.useLimit}
              onChange={(event) =>
                updateDraft("useLimit", Number(event.target.value))
              }
            >
              <option value={1}>{t.useLimit.once}</option>
              <option value={2}>{t.useLimit.twice}</option>
              <option value={5}>{t.useLimit.five}</option>
              <option value={10}>{t.useLimit.ten}</option>
              <option value={0}>{t.useLimit.unlimited}</option>
            </select>
          </label>

          <label className="settings-access-field">
            <span>{t.session.label}</span>
            <select
              value={draft.sessionMinutes}
              onChange={(event) =>
                updateDraft("sessionMinutes", Number(event.target.value))
              }
            >
              <option value={30}>{t.duration.minutes30}</option>
              <option value={120}>{t.duration.hours2}</option>
              <option value={1440}>{t.duration.hours24}</option>
            </select>
          </label>

          <label className="settings-access-field settings-access-field--wide">
            <span>{t.tokenLifetime.label}</span>
            <select
              value={draft.tokenTtlMinutes}
              onChange={(event) =>
                updateDraft("tokenTtlMinutes", Number(event.target.value))
              }
            >
              <option value={30}>{t.duration.minutes30}</option>
              <option value={120}>{t.duration.hours2}</option>
              <option value={1440}>{t.duration.hours24}</option>
              <option value={0}>{t.duration.cycle}</option>
            </select>
          </label>
        </div>
      )}

      {draft.mode === "link" && (
        <label className="settings-access-field">
          <span>{t.tokenLifetime.label}</span>
          <select value={draft.tokenTtlMinutes}
            onChange={(event) => updateDraft("tokenTtlMinutes", Number(event.target.value))}>
            <option value={60}>{t.duration.hours1}</option>
            <option value={360}>{t.duration.hours6}</option>
            <option value={720}>{t.duration.hours12}</option>
            <option value={1440}>{t.duration.hours24}</option>
            <option value={10080}>{t.duration.days7}</option>
            <option value={0}>{t.duration.forever}</option>
          </select>
        </label>
      )}
      {active?.mode === "link" && (active.staticLinks || []).length > 0 && (
        <div className="settings-access-options">
          <strong>{t.staticLinks.title}</strong>
          {(active.staticLinks || []).map((link) => (
            <div key={link.id} className="settings-access-token-status">
              <span>{link.hint} — {link.active ? t.staticLinks.active : t.staticLinks.inactive}</span>
              <span>{link.expiresAt
                ? formatMediumDateTime(link.expiresAt, language)
                : t.duration.forever}</span>
              {link.active && (
                <button type="button" className="settings-access-revoke"
                  onClick={() => revokeOne(link.id)} disabled={busy}>
                  {t.actions.revoke}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {active?.mode === "code" && active?.token && (
        <div className="settings-access-token-status">
          <strong>{t.currentToken.title}</strong>
          <span>
            {t.currentToken.hint.replace("{{hint}}", active.token.hint || "—")}
          </span>
          <span>
            {active.token.useLimit === 0
              ? t.currentToken.unlimited
              : t.currentToken.uses
                  .replace("{{used}}", String(active.token.usedCount || 0))
                  .replace("{{limit}}", String(active.token.useLimit || 0))}
          </span>
          {active.token.expiresAt && (
            <span>
              {t.currentToken.expires.replace(
                "{{date}}",
                formatMediumDateTime(active.token.expiresAt, language),
              )}
            </span>
          )}
        </div>
      )}

      {generated?.resource === selectedResource && (
        <div className="settings-access-generated">
          <div>
            <strong>{t.generated.title}</strong>
            <span>{t.generated.once}</span>
          </div>
          <code>{generated.value}</code>
          <button type="button" onClick={copyGenerated}>
            <Copy size={16} aria-hidden="true" />
            {t.actions.copy}
          </button>
        </div>
      )}

      {messageKey && (
        <div className="settings-access-message is-success">
          {t.messages[messageKey]}
        </div>
      )}
      {errorKey && (
        <div className="settings-access-message is-error">
          {t.errors[errorKey]}
        </div>
      )}

      <div className="settings-access-actions">
        <button
          type="button"
          className="admin-secondary-button"
          onClick={save}
          disabled={busy}
        >
          {t.actions.save}
        </button>

        {draft.mode === "link" && (
          <button
            type="button"
            className="admin-primary-button"
            onClick={generate}
            disabled={busy}
          >
            <img
              className="settings-access-inline-icon"
              src={draft.mode === "code" ? icons.code : icons.link}
              alt=""
              aria-hidden="true"
            />
            {draft.mode === "code"
              ? t.actions.generateCode
              : t.actions.generateLink}
          </button>
        )}

        {active?.mode !== "link" && active?.token?.active && (
          <button
            type="button"
            className="settings-access-revoke"
            onClick={revoke}
            disabled={busy}
          >
            <img className="settings-access-inline-icon" src={icons.revoke} alt="" aria-hidden="true" />
            {t.actions.revoke}
          </button>
        )}
      </div>

      {!active?.period && draft.mode === "code" && (
        <p className="settings-access-note">{t.noPeriod}</p>
      )}

      <p className="settings-access-note">{t.cycleNote}</p>
    </div>
  );
}
