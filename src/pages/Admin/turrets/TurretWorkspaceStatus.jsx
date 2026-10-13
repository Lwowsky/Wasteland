import { LoaderCircle } from "lucide-react";
import "./TurretWorkspaceStatus.css";

/** A local working copy is always distinct from a shared D1 draft and publication. */
export default function TurretWorkspaceStatus({ sync, t, requestConfirm, confirmTitle }) {
  if (!sync?.editable) return null;
  const { dirty, busy, blocked, remoteConflict, rosterChanged, localStorageError } = sync;
  const needsAttention = remoteConflict || rosterChanged || localStorageError || blocked;
  const statusImage = needsAttention
    ? "/images/registration-settings/warning-icon.webp"
    : dirty ? "/images/admin/icons/actions/edit.webp"
      : "/images/admin/icons/actions/approve.webp";
  const status = remoteConflict ? t.conflict : rosterChanged ? t.rosterChanged :
    localStorageError ? t.storageError : blocked ? t.blocked : busy ? t.saving :
      dirty ? t.localOnly : t.shared;
  return (
    <div className={`turret-workspace-status${needsAttention ? " turret-workspace-status--warn" : ""}`}
      role="status" aria-live="polite">
      <span className="turret-workspace-status__label">
        {busy ? <LoaderCircle size={16} aria-hidden="true" /> :
          <img className="turret-workspace-status__icon" src={statusImage} alt="" aria-hidden="true" />}
        {status}
      </span>
      {rosterChanged && <button type="button" className="turret-workspace-status__secondary"
        disabled={!sync.canReviewRoster} onClick={sync.acknowledgeRoster}>
        {t.confirmRoster}
      </button>}
      <button type="button" className="turret-workspace-status__secondary"
        disabled={busy} onClick={() => {
          if (!dirty) { sync.reloadShared(); return; }
          requestConfirm?.({ title: confirmTitle, message: t.confirmReload,
            onConfirm: sync.reloadShared, tone: "danger" });
        }}><img className="turret-workspace-status__icon" src="/images/admin/icons/settings/players-import.webp" alt="" aria-hidden="true" />{t.reload}</button>
      <button type="button" className="turret-workspace-status__save" disabled={!dirty || busy || blocked ||
        remoteConflict || rosterChanged} onClick={sync.saveShared}>
        {busy ? <LoaderCircle size={16} aria-hidden="true" /> : <img className="turret-workspace-status__icon" src="/images/admin/icons/settings/players-export.webp" alt="" aria-hidden="true" />}
        {t.saveShared}
      </button>
    </div>
  );
}
