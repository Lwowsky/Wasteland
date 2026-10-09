export function getLanguagePath(pathname, newLanguage) {
  const parts = pathname.split("/");

  parts[1] = newLanguage;

  return parts.join("/");
}