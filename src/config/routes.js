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
