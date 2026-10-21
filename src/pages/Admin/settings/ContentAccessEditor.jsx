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
  revokeOne,
  deleteOne,
  copyStoredLink,
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
          <option value="link">{t.modes.link}</option>
        </select>
      </label>

      {draft.mode === "public" && (
        <p className="settings-access-note" role="status">{t.publicWarning}</p>
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
        <div className="settings-access-link-groups">
          {[true, false].map((isActive) => {
            const links = (active.staticLinks || []).filter((link) => Boolean(link.active) === isActive);
            if (!links.length) return null;
            return (
              <section key={String(isActive)} className="settings-access-link-section">
                <h4>{isActive ? t.staticLinks.title : t.staticLinks.history}</h4>
                <div className="settings-access-link-list">
                  {links.map((link) => (
                    <div key={link.id} className={`settings-access-link-row${isActive ? "" : " is-archived"}`}>
                      <div className="settings-access-link-info">
                        <strong>{link.hint}</strong>
                        <span>{isActive ? t.staticLinks.active : t.staticLinks.inactive}</span>
                        <span>{link.expiresAt
                          ? formatMediumDateTime(link.expiresAt, language)
                          : t.duration.forever}</span>
                      </div>
                      {isActive && link.token ? (
                        <code className="settings-access-stored-url">
                          {new URL(`${import.meta.env.BASE_URL}s/${selectedResource === "players" ? "p" : "f"}${link.token}`, window.location.origin).toString()}
                        </code>
                      ) : null}
                      <div className="settings-access-link-buttons">
                        {isActive && link.token && (
                          <button type="button" className="settings-access-copy"
                            onClick={() => copyStoredLink(link.token, selectedResource)} disabled={busy}>
                            <Copy size={16} aria-hidden="true" /> {t.actions.copy}
                          </button>
                        )}
                        {isActive ? (
                          <button type="button" className="settings-access-revoke"
                            onClick={() => revokeOne(link.id)} disabled={busy}>
                            {t.actions.revoke}
                          </button>
                        ) : (
                          <button type="button" className="settings-access-revoke"
                            onClick={() => deleteOne(link.id)} disabled={busy}>
                            {t.staticLinks.delete}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {generated?.resource === selectedResource && !(generated.kind === "link" && active?.staticLinks?.some((link) => link.token && generated.value.endsWith(link.token))) && (
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
              src={icons.link}
              alt=""
              aria-hidden="true"
            />
            {t.actions.generateLink}
          </button>
        )}

      </div>


      <p className="settings-access-note">{t.cycleNote}</p>
    </div>
  );
}
