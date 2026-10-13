/**
 * Resolve files from Vite's public/ directory across localhost, GitHub project
 * Pages (/Wasteland/), and any other deployment base path.
 *
 * Keep BASE_URL as an explicit static reference: Vite replaces it at build time.
 */
export function publicAsset(path) {
  // This guard permits using the helper in Node unit tests without Vite.
  const base = import.meta.env ? import.meta.env.BASE_URL : "/";
  const prefix = String(base || "/").replace(/\/?$/, "/");
  return `${prefix}${String(path).replace(/^\/+/, "")}`;
}
