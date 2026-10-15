import { lazy, Suspense, useState } from "react";

import {
  hasPermission,
  PERMISSIONS,
} from "../../../features/auth/permissions.js";

import AccessNav from "../access/AccessNav.jsx";
import UsersAccessView from "../access/UsersAccessView.jsx";

import "../styles/access/AccessNav.css";
import "../styles/access/AccessOverview.css";
import "../styles/access/AccessUsers.css";
import "../styles/access/AccessRequests.css";

const CloudflareLimitsView = lazy(() => import("../access/CloudflareLimitsView.jsx"));

const AccessRequestsView = lazy(() =>
  import("../access/AccessRequestsView.jsx"),
);

function AccessTab({
  t,
  language,
  currentAdmin,

  adminUsers,
  adminUsersLoading,
  adminUsersError,
  processingUserId,
  onSaveUser,
  onDeleteUser,

  requests,
  requestsLoading,
  requestsError,
  processingRequestId,
  onRequestRoleChange,
  onApproveRequest,
  onRejectRequest,
  onDeleteRequest,
}) {
  const [activeTab, setActiveTab] = useState("users");

  const canViewRequests = hasPermission(
    currentAdmin.role,
    PERMISSIONS.VIEW_REQUESTS,
    currentAdmin.permissions,
  );

  const canViewLimits = currentAdmin.role === "owner";

  const pendingCount = requests.filter(
    (request) => !request.status || request.status === "pending",
  ).length;

  function handleTabChange(nextTab) {
    if (nextTab === "requests" && !canViewRequests) {
      return;
    }

    if (nextTab === "limits" && !canViewLimits) return;
    setActiveTab(nextTab);
  }

  return (
    <section className="admin-section admin-access-tab">
      <AccessNav
        t={t}
        activeTab={activeTab}
        onChange={handleTabChange}
        usersCount={adminUsers.length}
        pendingCount={pendingCount}
        canViewRequests={canViewRequests}
        canViewLimits={canViewLimits}
      />

      {activeTab === "users" && (
        <UsersAccessView
          t={t}
          language={language}
          currentUserRole={currentAdmin.role}
          canManageAccess={hasPermission(currentAdmin.role, PERMISSIONS.MANAGE_ACCESS, currentAdmin.permissions)}
          canGrantAdmin={hasPermission(currentAdmin.role, PERMISSIONS.GRANT_ADMIN, currentAdmin.permissions)}
          adminUsers={adminUsers}
          requests={requests}
          canViewRequests={canViewRequests}
          loading={adminUsersLoading}
          error={adminUsersError}
          processingUserId={processingUserId}
          onSaveUser={onSaveUser}
          onDeleteUser={onDeleteUser}
          onOpenRequests={() => handleTabChange("requests")}
        />
      )}

      <Suspense fallback={<div className="admin-loading">{t.common.loading}</div>}>
        {activeTab === "limits" && canViewLimits && <CloudflareLimitsView t={t} />}
        {activeTab === "requests" && canViewRequests && (
          <AccessRequestsView
            t={t}
            currentUserRole={currentAdmin.role}
            canGrantAdmin={hasPermission(currentAdmin.role, PERMISSIONS.GRANT_ADMIN, currentAdmin.permissions)}
            canManageRequests={hasPermission(currentAdmin.role, PERMISSIONS.MANAGE_REQUESTS, currentAdmin.permissions)}
            requests={requests}
            loading={requestsLoading}
            error={requestsError}
            processingId={processingRequestId}
            onRoleChange={onRequestRoleChange}
            onApprove={onApproveRequest}
            onReject={onRejectRequest}
            onDelete={onDeleteRequest}
          />
        )}
      </Suspense>
    </section>
  );
}

export default AccessTab;
