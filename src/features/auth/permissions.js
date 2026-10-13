export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  CONSUL: "consul",
};

export const PERMISSIONS = {
  VIEW_ACCESS: "view_access",
  MANAGE_ACCESS: "manage_access",
  VIEW_PLAYERS: "view_players",
  EDIT_PLAYERS: "edit_players",
  DELETE_PLAYERS: "delete_players",
  IMPORT_PLAYERS: "import_players",
  CLEAR_PLAYERS: "clear_players",
  VIEW_DISTRIBUTION: "view_distribution",
  EDIT_DISTRIBUTION: "edit_distribution",
  PUBLISH_FINAL_PLAN: "publish_final_plan",
  VIEW_REGISTRATION_SETTINGS: "view_registration_settings",
  EDIT_REGISTRATION_SETTINGS: "edit_registration_settings",
  VIEW_REQUESTS: "view_requests",
  MANAGE_REQUESTS: "manage_requests",
  VIEW_SETTINGS: "view_settings",
  MANAGE_CONTENT_ACCESS: "manage_content_access",
  MANAGE_SITE_APPEARANCE: "manage_site_appearance",
  MANAGE_REGION_BACKUP: "manage_region_backup",
  RESET_REGION: "reset_region",
  MANAGE_CONSULS: "manage_consuls",
  GRANT_ADMIN: "grant_admin",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const OWNER_ONLY = new Set([PERMISSIONS.RESET_REGION]);
const CONSUL_RESTRICTED = new Set([
  PERMISSIONS.VIEW_ACCESS,
  PERMISSIONS.MANAGE_ACCESS,
  PERMISSIONS.MANAGE_CONSULS,
  PERMISSIONS.GRANT_ADMIN,
  PERMISSIONS.VIEW_REQUESTS,
  PERMISSIONS.MANAGE_REQUESTS,
  PERMISSIONS.MANAGE_SITE_APPEARANCE,
  PERMISSIONS.MANAGE_REGION_BACKUP,
  PERMISSIONS.RESET_REGION,
]);

export function roleAllowsPermission(role, permission) {
  if (!ALL_PERMISSIONS.includes(permission)) return false;
  if (role === ROLES.OWNER) return true;
  if (role === ROLES.ADMIN) return !OWNER_ONLY.has(permission);
  if (role === ROLES.CONSUL) return !CONSUL_RESTRICTED.has(permission);
  return false;
}

export function getDefaultPermissionsForRole(role) {
  return Object.fromEntries(
    ALL_PERMISSIONS.map((permission) => [permission, roleAllowsPermission(role, permission)]),
  );
}

export function sanitizePermissionsForRole(role, permissions = {}) {
  if (role === ROLES.OWNER) return getDefaultPermissionsForRole(ROLES.OWNER);
  return Object.fromEntries(
    ALL_PERMISSIONS.map((permission) => {
      if (!roleAllowsPermission(role, permission)) return [permission, false];
      return [permission, permissions?.[permission] !== false];
    }),
  );
}

export function hasPermission(role, permission, permissions = null) {
  return roleAllowsPermission(role, permission) &&
    (role === ROLES.OWNER || permissions?.[permission] !== false);
}

export function canManageUser(currentRole, targetRole) {
  return (currentRole === ROLES.OWNER || currentRole === ROLES.ADMIN) &&
    targetRole !== ROLES.OWNER;
}

export function canGrantRole(currentRole, targetRole) {
  return canManageUser(currentRole, targetRole) &&
    (targetRole === ROLES.ADMIN || targetRole === ROLES.CONSUL);
}
