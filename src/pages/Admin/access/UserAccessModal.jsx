import {
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  Save,
  Trash2,
} from "lucide-react";

import { useMemo, useState } from "react";

import Modal from "../../../components/Modal/Modal.jsx";
import { formatMediumDateTime } from "../../../utils/date.js";

import {
  canManageUser,
  getDefaultPermissionsForRole,
  PERMISSIONS,
  ROLES,
  sanitizePermissionsForRole,
} from "../../../features/auth/permissions.js";

import PermissionGroup from "./PermissionGroup.jsx";

import "../styles/access/AccessModal.css";

const PERMISSION_GROUPS = [
  {
    key: "players",

    permissions: [
      PERMISSIONS.VIEW_PLAYERS,
      PERMISSIONS.EDIT_PLAYERS,
      PERMISSIONS.DELETE_PLAYERS,
      PERMISSIONS.IMPORT_PLAYERS,
      PERMISSIONS.CLEAR_PLAYERS,
    ],
  },

  {
    key: "distribution",

    permissions: [PERMISSIONS.VIEW_DISTRIBUTION, PERMISSIONS.EDIT_DISTRIBUTION, PERMISSIONS.PUBLISH_FINAL_PLAN],
  },

  {
    key: "registration",

    permissions: [
      PERMISSIONS.VIEW_REGISTRATION_SETTINGS,
      PERMISSIONS.EDIT_REGISTRATION_SETTINGS,
    ],
  },

  {
    key: "access",

    permissions: [
      PERMISSIONS.VIEW_ACCESS,
      PERMISSIONS.MANAGE_ACCESS,
      PERMISSIONS.MANAGE_CONSULS,
      PERMISSIONS.GRANT_ADMIN,
    ],
  },

  {
    key: "requests",

    permissions: [PERMISSIONS.VIEW_REQUESTS, PERMISSIONS.MANAGE_REQUESTS],
  },

  {
    key: "settings",

    permissions: [
      PERMISSIONS.VIEW_SETTINGS,
      PERMISSIONS.MANAGE_CONTENT_ACCESS,
      PERMISSIONS.MANAGE_SITE_APPEARANCE,
      PERMISSIONS.MANAGE_REGION_BACKUP,
      PERMISSIONS.RESET_REGION,
    ],
  },
];

function UserAccessModal({
  t,
  language,
  user,
  currentUserRole,
  canManageAccess,
  canGrantAdmin,
  saving,
  onClose,
  onSave,
  onDelete,
}) {
  const [role, setRole] = useState(user.role);

  const [active, setActive] = useState(user.active);

  const [permissions, setPermissions] = useState(() =>
    sanitizePermissionsForRole(user.role, user.permissions),
  );

  const [showTechnical, setShowTechnical] = useState(false);

  const editable = canManageAccess && canManageUser(currentUserRole, user.role);

  const isOwner = user.role === ROLES.OWNER;

  const canChangeRole = editable && canGrantAdmin && !isOwner;

  const roleOptions = useMemo(() => {
    if (!canChangeRole) {
      return [user.role];
    }

    return [ROLES.ADMIN, ROLES.CONSUL];
  }, [canChangeRole, user.role]);

  function handleRoleChange(newRole) {
    setRole(newRole);

    setPermissions(sanitizePermissionsForRole(newRole, permissions));
  }

  function handleRestoreDefaults() {
    setPermissions(getDefaultPermissionsForRole(role));
  }

  function handleDisableAll() {
    setPermissions(Object.fromEntries(
      Object.keys(permissions).map((permission) => [permission, false]),
    ));
  }

  function handlePermissionChange(permission, value) {
    setPermissions((current) => ({
      ...current,
      [permission]: value,
    }));
  }

  async function handleSave() {
    if (!editable) {
      return;
    }

    await onSave(user, {
      role,
      active,

      permissions: sanitizePermissionsForRole(role, permissions),
    });
  }

  const displayName = user.displayName || user.email || t.common.unknown;

  const initial = displayName.charAt(0).toUpperCase();

  const statusLabel = active ? t.common.status.active : t.common.status.blocked;

  const headerContent = (
    <div className="admin-user-modal__profile">
      <div className="admin-user-modal__avatar">{initial}</div>

      <div className="admin-user-modal__profile-text">
        <h2>{displayName}</h2>

        <p>{user.email || "—"}</p>
      </div>
    </div>
  );

  const footer = (
    <>
      <div>
        {editable && (
          <button
            type="button"
            className="admin-danger-button"
            onClick={() => onDelete(user)}
            disabled={saving}
          >
            <Trash2 size={16} aria-hidden="true" />

            {t.common.actions.removeAccess}
          </button>
        )}
      </div>

      <div className="admin-user-modal__footer-right">
        <button
          type="button"
          className="admin-secondary-button"
          onClick={onClose}
          disabled={saving}
        >
          {t.common.actions.cancel}
        </button>

        {editable && (
          <button
            type="button"
            className="admin-primary-button"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} aria-hidden="true" />

            {saving ? t.access.modal.saving : t.common.actions.save}
          </button>
        )}
      </div>
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      width="1180px"
      headerContent={headerContent}
      closeLabel={t.common.actions.close}
      ariaLabel={displayName}
      className="admin-user-site-modal"
    >
      <div className="admin-user-modal__content">
        <div className="admin-user-modal__summary">
          <div className="admin-user-summary-card">
            <span>{t.access.modal.role}</span>

            {canChangeRole ? (
              <select
                value={role}
                aria-label={t.access.modal.role}
                onChange={(event) => handleRoleChange(event.target.value)}
              >
                {roleOptions.map((item) => (
                  <option key={item} value={item}>
                    {t.common.roles[item]}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{t.common.roles[role]}</strong>
            )}
          </div>

          <div className="admin-user-summary-card">
            <span>{t.access.modal.status}</span>

            {editable ? (
              <label className="admin-user-status-toggle">
                <input
                  type="checkbox"
                  checked={active}
                  aria-label={t.access.modal.status}
                  onChange={(event) => setActive(event.target.checked)}
                />

                <strong>{statusLabel}</strong>
              </label>
            ) : (
              <strong>{statusLabel}</strong>
            )}
          </div>

          <div className="admin-user-summary-card">
            <span>{t.access.modal.createdAt}</span>

            <strong>{formatMediumDateTime(user.createdAt, language)}</strong>
          </div>

          <div className="admin-user-summary-card">
            <span>{t.access.modal.updatedAt}</span>

            <strong>{formatMediumDateTime(user.updatedAt, language)}</strong>
          </div>
        </div>

        <div className="admin-user-modal__permissions-heading">
          <div>
            <h3>{t.access.modal.permissions}</h3>

            <p>
              {isOwner
                ? t.access.modal.ownerPermissions
                : t.access.modal.permissionsText}
            </p>
          </div>

          {editable && (
            <div className="admin-user-modal__permission-actions">
              <button type="button" className="admin-secondary-button" onClick={handleRestoreDefaults} disabled={saving}>
                {t.access.modal.restoreDefaults}
              </button>
              <button type="button" className="admin-secondary-button" onClick={handleDisableAll} disabled={saving}>
                {t.access.modal.disableRolePermissions}
              </button>
            </div>
          )}

          {isOwner && (
            <div className="admin-user-modal__owner-lock">
              <LockKeyhole size={18} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="admin-user-modal__permissions-grid">
          {PERMISSION_GROUPS.map((group) => (
            <PermissionGroup
              key={group.key}
              title={t.access.permissionGroups[group.key].title}
              description={t.access.permissionGroups[group.key].description}
              permissions={group.permissions}
              role={role}
              values={permissions}
              editable={editable}
              labels={t.access.permissionLabels}
              onChange={handlePermissionChange}
            />
          ))}
        </div>

        <div className="admin-user-modal__technical">
          <button
            type="button"
            className="admin-user-modal__technical-toggle"
            onClick={() => setShowTechnical((current) => !current)}
            aria-expanded={showTechnical}
          >
            <span>{t.access.modal.technicalInfo}</span>

            {showTechnical ? (
              <ChevronUp size={17} aria-hidden="true" />
            ) : (
              <ChevronDown size={17} aria-hidden="true" />
            )}
          </button>

          {showTechnical && (
            <div className="admin-user-modal__technical-content">
              <div>
                <span>{t.access.modal.uid}</span>

                <strong>{user.id || "—"}</strong>
              </div>
            </div>
          )}
        </div>

        <footer className="site-modal__footer admin-user-modal__bottom-actions">
          {footer}
        </footer>
      </div>
    </Modal>
  );
}

export default UserAccessModal;
