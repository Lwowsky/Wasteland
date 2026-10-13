import { canGrantRole, ROLES } from "../../../features/auth/permissions.js";

function AccessRequestsView({
  t,
  currentUserRole,
  canGrantAdmin,
  canManageRequests,
  requests,
  loading,
  error,
  processingId,
  onRoleChange,
  onApprove,
  onReject,
  onDelete,
}) {
  const availableRoles = [ROLES.ADMIN, ROLES.CONSUL].filter((role) =>
    canManageRequests && canGrantRole(currentUserRole, role) && (role !== ROLES.ADMIN || canGrantAdmin),
  );

  function getStatusClass(status) {
    if (status === "approved") {
      return "approved";
    }

    if (status === "rejected") {
      return "rejected";
    }

    return "pending";
  }

  function getStatusLabel(status) {
    if (status === "approved") {
      return t.common.status.approved;
    }

    if (status === "rejected") {
      return t.common.status.rejected;
    }

    return t.common.status.pending;
  }

  if (loading) {
    return <div className="admin-empty-state">{t.common.loading}</div>;
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  const pendingCount = requests.filter(
    (request) => !request.status || request.status === "pending",
  ).length;

  return (
    <div className="admin-requests-view">
      <div className="admin-section__head">
        <div>
          <h2>{t.requests.title}</h2>

          <p>{t.requests.description}</p>
        </div>

        <div className="admin-requests-counter">
          <span>{pendingCount}</span>

          {t.common.status.pending}
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="admin-empty-state">{t.requests.empty}</div>
      ) : (
        <div className="admin-requests-card">
          <div className="admin-requests-table admin-requests-table--head">
            <span>{t.requests.columns.user}</span>

            <span>{t.requests.columns.email}</span>

            <span>{t.requests.columns.role}</span>

            <span>{t.requests.columns.comment}</span>

            <span>{t.requests.columns.status}</span>

            <span>{t.requests.columns.actions}</span>
          </div>

          {requests.map((request) => {
            const status = request.status || "pending";

            const isPending = status === "pending";

            const processing = processingId === request.id;

            const displayName =
              request.displayName || request.email || t.common.unknown;

            const initial = displayName.charAt(0).toUpperCase();

            const selectedRole = request.requestedRole || ROLES.CONSUL;

            return (
              <div
                key={request.id}
                className="admin-requests-table admin-requests-table--row"
              >
                <div className="admin-request-user">
                  <div className="admin-request-user__avatar">{initial}</div>

                  <strong>{displayName}</strong>
                </div>

                <span className="admin-request-email">
                  {request.email || "—"}
                </span>

                <select
                  className="admin-request-role-select"
                  value={selectedRole}
                  disabled={!isPending || processing || !canManageRequests}
                  aria-label={t.requests.columns.role}
                  onChange={(event) =>
                    onRoleChange(request.id, event.target.value)
                  }
                >
                  {!availableRoles.includes(selectedRole) && (
                    <option value={selectedRole} disabled>{t.common.roles[selectedRole]}</option>
                  )}
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {t.common.roles[role]}
                    </option>
                  ))}
                </select>

                <span
                  className="admin-request-comment"
                  title={request.comment || ""}
                >
                  {request.comment || "—"}
                </span>

                <span
                  className={`admin-request-status admin-request-status--${getStatusClass(
                    status,
                  )}`}
                >
                  <span
                    className="admin-request-status__dot"
                    aria-hidden="true"
                  />

                  {getStatusLabel(status)}
                </span>

                <div className="admin-request-actions">
                  <button
                    type="button"
                    className="admin-action-image-button"
                    title={t.requests.actions.approve}
                    aria-label={t.requests.actions.approve}
                    disabled={!isPending || processing || !canManageRequests}
                    onClick={() => onApprove(request)}
                  >
                    <img
                      src="/images/admin/icons/actions/approve.webp"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    className="admin-action-image-button"
                    title={t.requests.actions.reject}
                    aria-label={t.requests.actions.reject}
                    disabled={!isPending || processing || !canManageRequests}
                    onClick={() => onReject(request)}
                  >
                    <img
                      src="/images/admin/icons/actions/reject.webp"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    className="admin-action-image-button"
                    title={t.common.actions.delete}
                    aria-label={t.common.actions.delete}
                    disabled={processing || !canManageRequests}
                    onClick={() => onDelete(request)}
                  >
                    <img
                      src="/images/admin/icons/actions/delete.webp"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AccessRequestsView;
