export const ROUTES = {
  home: "",
  registration: "registration",
  players: "players",
  finalPlan: "final-plan",
  settings: "settings",
  admin: "admin",
};

export function getRoute(language, route) {
  if (!route) {
    return `/${language}`;
  }

  return `/${language}/${route}`;
}

// Only known public routes may be redirected without a language prefix.
// Unknown paths still render the ordinary 404 page, never an admin bypass.
export const LANGUAGELESS_ROUTE_ALIASES = Object.freeze({
  registration: ROUTES.registration,
  players: ROUTES.players,
  player: ROUTES.players, // Common singular form, e.g. /en/player.
  "final-plan": ROUTES.finalPlan,
  settings: ROUTES.settings,
  login: "login",
  "access-denied": "access-denied",
  admin: ROUTES.admin,
});

export function resolveLanguageFreeRoute(segment) {
  return Object.hasOwn(LANGUAGELESS_ROUTE_ALIASES, segment)
    ? LANGUAGELESS_ROUTE_ALIASES[segment]
    : null;
}
