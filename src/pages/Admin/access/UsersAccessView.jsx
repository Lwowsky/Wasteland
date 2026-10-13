import { publicAsset } from "../../../utils/publicAsset.js";

import { lazy, Suspense, useState } from "react";

import { canManageUser, ROLES } from "../../../features/auth/permissions.js";

import AccessOverviewCards from "./AccessOverviewCards.jsx";

const UserAccessModal = lazy(() => import("./UserAccessModal.jsx"));

const ROLE_ICONS = {
  [ROLES.OWNER]: publicAsset("/images/admin/icons/owner.webp"),
  [ROLES.ADMIN]: publicAsset("/images/admin/icons/admin.webp"),
  [ROLES.CONSUL]: publicAsset("/images/admin/icons/consul.webp"),
};

const ACTION_ICONS = {
  delete: publicAsset("/images/admin/icons/actions/delete.webp"),
  lock: publicAsset("/images/admin/icons/actions/lock.webp"),
};

function UsersAccessView({
  t,
  language,
  currentUserRole,
  canManageAccess,
  canGrantAdmin,
  adminUsers,
  requests = [],
  canViewRequests,
  loading,
  error,
  processingUserId,
  onSaveUser,
  onDeleteUser,
  onOpenRequests,
}) {
  const [selectedUser, setSelectedUser] = useState(null);

  function openUser(user) {
    setSelectedUser(user);
  }

  function closeUser() {
    if (processingUserId) {
      return;
    }

    setSelectedUser(null);
  }

  async function handleSave(user, values) {
    await onSaveUser(user, values);

    setSelectedUser(null);
  }

  async function handleDelete(user) {
    const deleted = await onDeleteUser(user);

    if (deleted) {
      setSelectedUser(null);
    }
  }

  function getInitial(user) {
    const value = user.displayName || user.email || "?";

    return value.charAt(0).toUpperCase();
  }

  return (
    <>
      <div className="admin-section__head">
        <div>
          <h2>{t.access.title}</h2>

          <p>{t.access.description}</p>
        </div>
      </div>

      {loading && <p className="admin-loading">{t.access.loading}</p>}

      {error && <p className="admin-error">{error}</p>}

      {!loading && (
        <>
          <AccessOverviewCards
            t={t}
            adminUsers={adminUsers}
            requests={requests}
            canViewRequests={canViewRequests}
            onOpenRequests={onOpenRequests}
          />

          <div className="admin-table-card">
            <div className="admin-access-table__head">
              <span>{t.access.columns.user}</span>

              <span>{t.access.columns.role}</span>

              <span>{t.access.columns.permissions}</span>

              <span>{t.access.columns.status}</span>

              <span>{t.access.columns.actions}</span>
            </div>

            {adminUsers.map((user) => {
              const manageable = canManageAccess && canManageUser(currentUserRole, user.role);

              const isOwner = user.role === ROLES.OWNER;

              const permissionCount = Object.values(
                user.permissions || {},
              ).filter(Boolean).length;

              const displayName =
                user.displayName || user.email || t.common.unknown;

              return (
                <div
                  key={user.id}
                  className="admin-access-table__row admin-access-table__row--clickable"
                  role="button"
                  tabIndex={0}
                  aria-label={displayName}
                  onClick={() => openUser(user)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();

                      openUser(user);
                    }
                  }}
                >
                  <div className="admin-user-cell">
                    <div className="admin-user-avatar">{getInitial(user)}</div>

                    <div className="admin-user-cell__text">
                      <strong>{displayName}</strong>

                      {user.email && <span>{user.email}</span>}
                    </div>
                  </div>

                  <span
                    className={`admin-badge admin-badge--role-${user.role}`}
                  >
                    <img
                      className="admin-badge__icon"
                      src={ROLE_ICONS[user.role]}
                      alt=""
                      aria-hidden="true"
                    />

                    <span className="admin-badge__label">
                      {t.common.roles[user.role]}
                    </span>
                  </span>

                  <span className="admin-access-table__permissions">
                    {isOwner
                      ? t.access.permissions.owner
                      : `${permissionCount} ${t.access.modal.permissionsCount}`}
                  </span>

                  <span
                    className={
                      user.active
                        ? "admin-status admin-status--active"
                        : "admin-status admin-status--blocked"
                    }
                  >
                    {user.active
                      ? t.common.status.active
                      : t.common.status.blocked}
                  </span>

                  {isOwner ? (
                    <span
                      className="admin-action-image-button admin-action-image-button--locked"
                      title={t.access.actions.ownerLocked}
                    >
                      <img src={ACTION_ICONS.lock} alt="" aria-hidden="true" />
                    </span>
                  ) : manageable ? (
                    <button
                      type="button"
                      className="admin-action-image-button"
                      title={t.common.actions.removeAccess}
                      aria-label={t.common.actions.removeAccess}
                      disabled={processingUserId === user.id}
                      onClick={(event) => {
                        event.stopPropagation();

                        handleDelete(user);
                      }}
                    >
                      <img
                        src={ACTION_ICONS.delete}
                        alt=""
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <span
                      className="admin-action-image-button admin-action-image-button--locked"
                      title={t.access.actions.notAllowed}
                    >
                      <img src={ACTION_ICONS.lock} alt="" aria-hidden="true" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Suspense fallback={null}>
        {selectedUser && (
          <UserAccessModal
            key={selectedUser.id}
            t={t}
            language={language}
            user={selectedUser}
            currentUserRole={currentUserRole}
            canManageAccess={canManageAccess}
            canGrantAdmin={canGrantAdmin}
            saving={processingUserId === selectedUser.id}
            onClose={closeUser}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </Suspense>
    </>
  );
}

export default UsersAccessView;
