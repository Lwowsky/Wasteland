/** Replace the first {{name}} placeholder, preserving existing admin copy behavior. */
export function replaceTemplateName(template, name) {
  return String(template || "").replace("{{name}}", name || "");
}
