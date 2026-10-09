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

  VIEW_DISTRIBUTION: "view_distribution",
  EDIT_DISTRIBUTION: "edit_distribution",

  VIEW_REGISTRATION_SETTINGS: "view_registration_settings",

  EDIT_REGISTRATION_SETTINGS: "edit_registration_settings",

  VIEW_REQUESTS: "view_requests",
  MANAGE_REQUESTS: "manage_requests",

  VIEW_SETTINGS: "view_settings",

  MANAGE_CONSULS: "manage_consuls",
  GRANT_ADMIN: "grant_admin",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ROLE_PERMISSION_SETS = {
  [ROLES.OWNER]: new Set(ALL_PERMISSIONS),

  [ROLES.ADMIN]: new Set([
    PERMISSIONS.VIEW_ACCESS,
    PERMISSIONS.MANAGE_ACCESS,

    PERMISSIONS.VIEW_PLAYERS,
    PERMISSIONS.EDIT_PLAYERS,
    PERMISSIONS.DELETE_PLAYERS,

    PERMISSIONS.VIEW_DISTRIBUTION,
    PERMISSIONS.EDIT_DISTRIBUTION,

    PERMISSIONS.VIEW_REGISTRATION_SETTINGS,
    PERMISSIONS.EDIT_REGISTRATION_SETTINGS,

    PERMISSIONS.VIEW_REQUESTS,
    PERMISSIONS.MANAGE_REQUESTS,

    PERMISSIONS.VIEW_SETTINGS,

    PERMISSIONS.MANAGE_CONSULS,
  ]),

  [ROLES.CONSUL]: new Set([
    // Таблиця гравців — повний доступ
    PERMISSIONS.VIEW_PLAYERS,
    PERMISSIONS.EDIT_PLAYERS,
    PERMISSIONS.DELETE_PLAYERS,

    // Розподіл / фінальний план
    PERMISSIONS.VIEW_DISTRIBUTION,
    PERMISSIONS.EDIT_DISTRIBUTION,

    // Реєстрація — повний доступ
    PERMISSIONS.VIEW_REGISTRATION_SETTINGS,
    PERMISSIONS.EDIT_REGISTRATION_SETTINGS,
  ]),
};

export function roleAllowsPermission(role, permission) {
  return ROLE_PERMISSION_SETS[role]?.has(permission) ?? false;
}

export function getDefaultPermissionsForRole(role) {
  return Object.fromEntries(
    ALL_PERMISSIONS.map((permission) => [
      permission,
      roleAllowsPermission(role, permission),
    ]),
  );
}

export function sanitizePermissionsForRole(role, permissions = {}) {
  if (role === ROLES.OWNER) {
    return getDefaultPermissionsForRole(ROLES.OWNER);
  }

  return Object.fromEntries(
    ALL_PERMISSIONS.map((permission) => {
      const allowed = roleAllowsPermission(role, permission);

      if (!allowed) {
        return [permission, false];
      }

      const storedValue = permissions[permission];

      return [
        permission,
        typeof storedValue === "boolean" ? storedValue : true,
      ];
    }),
  );
}

export function hasPermission(role, permission, permissions = null) {
  if (!roleAllowsPermission(role, permission)) {
    return false;
  }

  if (role === ROLES.OWNER) {
    return true;
  }

  if (permissions && permissions[permission] === false) {
    return false;
  }

  return true;
}

export function canManageUser(currentRole, targetRole) {
  if (currentRole === ROLES.OWNER) {
    return targetRole !== ROLES.OWNER;
  }

  if (currentRole === ROLES.ADMIN) {
    return targetRole === ROLES.CONSUL;
  }

  return false;
}

export function canGrantRole(currentRole, targetRole) {
  if (targetRole === ROLES.OWNER) {
    return false;
  }

  if (currentRole === ROLES.OWNER) {
    return targetRole === ROLES.ADMIN || targetRole === ROLES.CONSUL;
  }

  if (currentRole === ROLES.ADMIN) {
    return targetRole === ROLES.CONSUL;
  }

  return false;
}
