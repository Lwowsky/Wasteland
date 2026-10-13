/** Resolve public assets in local dev, GitHub project Pages and other base paths. */
export function publicAsset(path) {
  const base = import.meta.env?.BASE_URL || "/";
  return `${base.replace(/\/?$/, "/")}${String(path).replace(/^\/+/, "")}`;
}
