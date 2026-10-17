import { forgetSharedSession } from "../../features/auth/sharedConsulClient.js";
import { LogOut } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import ConfirmModal from "../../components/ConfirmModal/ConfirmModal.jsx";
import Page from "../../components/Page/Page.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";
import PagePanel from "../../components/PagePanel/PagePanel.jsx";
import { logout } from "../../features/auth/logout.js";
import { hasPermission, PERMISSIONS } from "../../features/auth/permissions.js";
import translations from "../../i18n/index.js";
import AdminTabs from "./components/AdminTabs.jsx";
import useAdminAccessData from "./hooks/useAdminAccessData.js";
import useAdminPlayersData from "./hooks/useAdminPlayersData.js";
import useAdminRegistrationSettings from "./hooks/useAdminRegistrationSettings.js";
import { clearWastelandClientData } from "./services/systemSettingsApi.js";

import "./Admin.css";
import "./styles/AdminTabs.css";

const AccessTab = lazy(() => import("./tabs/AccessTab.jsx"));
const PlayersAdminTab = lazy(() => import("./tabs/PlayersAdminTab.jsx"));
const TurretDistributionTab = lazy(() =>
  import("./tabs/TurretDistributionTab.jsx"),
);
const RegistrationSettingsTab = lazy(() =>
  import("./tabs/RegistrationSettingsTab.jsx"),
);
const SettingsTab = lazy(() => import("./tabs/SettingsTab.jsx"));

function replaceName(template, name) {
  return String(template || "").replace("{{name}}", name || "");
}

function Admin() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const { admin, user } = useOutletContext();
  const language = translations[lang] ? lang : "en";
  const t = translations[language].admin;

  const [confirmDialog, setConfirmDialog] = useState(null);

  const canViewAccess = hasPermission(
    admin.role,
    PERMISSIONS.VIEW_ACCESS,
    admin.permissions,
  );
  const canViewPlayers = hasPermission(
    admin.role,
    PERMISSIONS.VIEW_PLAYERS,
    admin.permissions,
  );
  const canEditPlayers = hasPermission(
    admin.role,
    PERMISSIONS.EDIT_PLAYERS,
    admin.permissions,
  );
  const canDeletePlayers = hasPermission(
    admin.role,
    PERMISSIONS.DELETE_PLAYERS,
    admin.permissions,
  );
  const canViewDistribution = hasPermission(
    admin.role,
    PERMISSIONS.VIEW_DISTRIBUTION,
    admin.permissions,
  );
  const canEditDistribution = hasPermission(
    admin.role,
    PERMISSIONS.EDIT_DISTRIBUTION,
    admin.permissions,
  );
  const canViewRegistration = hasPermission(
    admin.role,
    PERMISSIONS.VIEW_REGISTRATION_SETTINGS,
    admin.permissions,
  );
  const canEditRegistration = hasPermission(
    admin.role,
    PERMISSIONS.EDIT_REGISTRATION_SETTINGS,
    admin.permissions,
  );
  const canViewRequests = hasPermission(
    admin.role,
    PERMISSIONS.VIEW_REQUESTS,
    admin.permissions,
  );
  const canViewSettings = hasPermission(
    admin.role,
    PERMISSIONS.VIEW_SETTINGS,
    admin.permissions,
  );

  const [activeTab, setActiveTab] = useState(() => {
    if (canViewAccess) {
      return "access";
    }

    if (canViewPlayers) {
      return "players";
    }

    return "distribution";
  });

  const tabs = useMemo(() => {
    const result = [];

    if (canViewAccess) {
      result.push({ id: "access", label: t.common.tabs.access });
    }
    if (canViewPlayers) {
      result.push({ id: "players", label: t.common.tabs.players });
    }
    if (canViewDistribution) {
      result.push({ id: "distribution", label: t.common.tabs.distribution });
    }
    if (canViewRegistration) {
      result.push({ id: "registration", label: t.common.tabs.registration });
    }
    if (canViewSettings) {
      result.push({ id: "settings", label: t.common.tabs.settings });
    }

    return result;
  }, [
    canViewAccess,
    canViewPlayers,
    canViewDistribution,
    canViewRegistration,
    canViewSettings,
    t,
  ]);

  const resolvedActiveTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id || "";

  const needsPlayersData =
    (canViewPlayers || canViewDistribution) &&
    ["players", "registration", "settings", "distribution"].includes(resolvedActiveTab);
  const needsRegistrationSettings = [
    "players",
    "registration",
    "settings",
    "distribution",
  ].includes(resolvedActiveTab);
  const needsAccessData = resolvedActiveTab === "access";

  const playersData = useAdminPlayersData({
    enabled: needsPlayersData,
    canDelete: canDeletePlayers,
    autoSync: resolvedActiveTab === "players",
    cacheIdentity: canViewPlayers
      ? `${user?.uid || ""}:${admin?.id || ""}:${admin?.role || ""}`
      : "",
  });
  const registrationData = useAdminRegistrationSettings({
    enabled: needsRegistrationSettings,
  });
  const accessData = useAdminAccessData({
    enabled: needsAccessData,
    canViewUsers: canViewAccess,
    canViewRequests,
    currentUserRole: admin.role,
    canManageRequests: hasPermission(admin.role, PERMISSIONS.MANAGE_REQUESTS, admin.permissions),
    canGrantAdmin: hasPermission(admin.role, PERMISSIONS.GRANT_ADMIN, admin.permissions),
    canManageAccess: hasPermission(admin.role, PERMISSIONS.MANAGE_ACCESS, admin.permissions),
  });

  const playersError = playersData.errorKey
    ? t.players.errors[playersData.errorKey] || t.players.errors.load
    : "";
  const registrationSettingsError = registrationData.errorKey
    ? t.registration.errors[registrationData.errorKey] ||
      t.registration.errors.load
    : "";
  const adminUsersError = accessData.usersErrorKey
    ? t.access.errors[accessData.usersErrorKey] || t.access.errors.load
    : "";
  const accessRequestsError = accessData.requestsErrorKey
    ? t.requests.errors[accessData.requestsErrorKey] || t.requests.errors.load
    : "";

  function handleDeleteUser(user) {
    const name = user.displayName || user.email || "";

    return new Promise((resolve) => {
      setConfirmDialog({
        title: t.common.actions.removeAccess,
        message: replaceName(t.access.confirm.removeAccess, name),
        confirmLabel: t.common.actions.removeAccess,
        cancelLabel: t.common.actions.cancel,
        tone: "danger",
        onConfirm: async () => {
          resolve(await accessData.deleteUser(user));
        },
        onCancel: () => resolve(false),
      });
    });
  }

  function handleDeleteRequest(request) {
    const name = request.displayName || request.email || "";

    setConfirmDialog({
      title: t.common.actions.delete,
      message: replaceName(t.requests.confirm.delete, name),
      confirmLabel: t.common.actions.delete,
      cancelLabel: t.common.actions.cancel,
      tone: "danger",
      onConfirm: () => accessData.deleteRequest(request),
    });
  }

  async function handleFactoryResetCompleted({ clearBrowserData }) {
    if (clearBrowserData) {
      clearWastelandClientData();
    }

    window.location.reload();
  }

  async function handleLogout() {
    if (admin.shared) forgetSharedSession();
    else await logout();
    navigate(`/${language}/login`, { replace: true });
  }

  const effectiveRegistrationSettings = {
    ...registrationData.settings,
    ...(registrationData.settings.currentPeriodRules || {}),
  };

  return (
    <>
      <PageMeta
        title={t.common.title}
        description={t.common.subtitle}
        language={language}
        path="admin"
      />

      <Page containerClassName="admin-page-container">
        <div className="admin-page">
          <PagePanel className="admin-panel">
            <header className="admin-header">
              <div>
                <h1>{t.common.title}</h1>
                <p>{t.common.subtitle}</p>
              </div>

              <div className="admin-header__right">
                <div className="admin-header__profile">
                  <div className="admin-header__avatar">
                    {(admin.displayName || admin.email || "A")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="admin-header__profile-info">
                    <strong>{admin.displayName || admin.email}</strong>
                    <span>{t.common.roles[admin.role]}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-logout"
                  onClick={handleLogout}
                >
                  <span className="admin-logout__icon" aria-hidden="true">
                    <LogOut size={18} strokeWidth={2.3} />
                  </span>
                  <span className="admin-logout__label">
                    {t.common.actions.logout}
                  </span>
                </button>
              </div>
            </header>

            <AdminTabs
              tabs={tabs}
              activeTab={resolvedActiveTab}
              onChange={setActiveTab}
              ariaLabel={t.common.navigationLabel}
            />

            <div className="admin-content">
              <Suspense
                fallback={<div className="admin-loading">{t.common.loading}</div>}
              >
                {resolvedActiveTab === "access" && canViewAccess && (
                  <AccessTab
                    t={t}
                    language={language}
                    currentAdmin={admin}
                    adminUsers={accessData.users}
                    adminUsersLoading={accessData.usersLoading}
                    adminUsersError={adminUsersError}
                    processingUserId={accessData.processingUserId}
                    onSaveUser={accessData.saveUser}
                    onDeleteUser={handleDeleteUser}
                    requests={accessData.requests}
                    requestsLoading={accessData.requestsLoading}
                    requestsError={accessRequestsError}
                    processingRequestId={accessData.processingRequestId}
                    onRequestRoleChange={accessData.changeRequestRole}
                    onApproveRequest={accessData.approveRequest}
                    onRejectRequest={accessData.rejectRequest}
                    onDeleteRequest={handleDeleteRequest}
                  />
                )}

                {resolvedActiveTab === "players" && canViewPlayers && (
                  <PlayersAdminTab
                    t={t}
                    language={language}
                    players={playersData.players}
                    loading={playersData.loading}
                    error={playersError}
                    canEdit={canEditPlayers}
                    canDelete={canDeletePlayers}
                    saving={playersData.saving}
                    onCreate={playersData.createPlayer}
                    onUpdate={playersData.updatePlayer}
                    onDelete={playersData.deletePlayer}
                    registrationSettings={effectiveRegistrationSettings}
                    canTransferLocal={canEditPlayers}
                    onReloadPlayers={playersData.reload}
                    currentPeriod={playersData.period}
                    canManageDatabase={hasPermission(admin.role, PERMISSIONS.CLEAR_PLAYERS, admin.permissions)}
                  />
                )}

                {resolvedActiveTab === "distribution" && canViewDistribution && (
                  <TurretDistributionTab
                    language={language}
                    t={t}
                    publicT={translations[language]}
                    players={playersData.players}
                    period={playersData.period}
                    loading={playersData.loading}
                    error={playersError}
                    onReload={playersData.reload}
                    editable={canEditDistribution}
                    registrationSettings={effectiveRegistrationSettings}
                    registrationSettingsReady={registrationData.loaded}
                    registrationSettingsError={registrationSettingsError}
                    onReloadRegistrationSettings={registrationData.reload}
                    canPublish={hasPermission(admin.role, PERMISSIONS.PUBLISH_FINAL_PLAN, admin.permissions)}
                    userId={user.uid}
                  />
                )}

                {resolvedActiveTab === "registration" && canViewRegistration && (
                  <RegistrationSettingsTab
                    t={t}
                    language={language}
                    settings={registrationData.settings}
                    setSettings={registrationData.setSettings}
                    canEdit={canEditRegistration}
                    loading={registrationData.loading}
                    loadError={registrationSettingsError}
                    players={playersData.players}
                  />
                )}

                {resolvedActiveTab === "settings" && canViewSettings && (
                  <SettingsTab
                    t={t}
                    language={language}
                    players={playersData.players}
                    currentAdmin={admin}
                    registrationSettings={effectiveRegistrationSettings}
                    currentPeriod={playersData.period}
                    onPlayersImported={playersData.reload}
                    onFactoryResetCompleted={handleFactoryResetCompleted}
                  />
                )}
              </Suspense>
            </div>
          </PagePanel>
        </div>
      </Page>

      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        closeLabel={confirmDialog?.cancelLabel}
        tone={confirmDialog?.tone}
        busy={Boolean(
          accessData.processingUserId || accessData.processingRequestId,
        )}
        onCancel={() => {
          const onCancel = confirmDialog?.onCancel;
          setConfirmDialog(null);
          onCancel?.();
        }}
        onConfirm={async () => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          await action?.();
        }}
      />
    </>
  );
}

export default Admin;
