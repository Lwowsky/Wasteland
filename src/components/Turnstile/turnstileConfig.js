// Public client-side configuration. The private Turnstile secret stays in Worker secrets.
export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
export const turnstileEnabled = Boolean(turnstileSiteKey);
