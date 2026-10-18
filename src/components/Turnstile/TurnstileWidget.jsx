import { useEffect, useRef } from "react";
import { turnstileSiteKey } from "./turnstileConfig.js";

// Site key is public. Secret belongs ONLY to Worker environment secrets.
// When no public site key is configured the widget is intentionally absent.
const siteKey = turnstileSiteKey;
let scriptPromise;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error("TURNSTILE_SCRIPT_FAILED"));
      document.head.appendChild(script);
    }).catch((error) => { scriptPromise = null; throw error; });
  }
  return scriptPromise;
}

export default function TurnstileWidget({ onTokenChange, language = "auto", action = "shared_login" }) {
  const element = useRef(null);
  const callbackRef = useRef(onTokenChange);
  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);
  useEffect(() => {
    if (!siteKey) return undefined;
    let disposed = false;
    let widgetId;
    loadTurnstile().then((turnstile) => {
      if (disposed || !turnstile || !element.current) return;
      widgetId = turnstile.render(element.current, {
        sitekey: siteKey,
        action,
        language,
        size: element.current.clientWidth < 300 ? "compact" : "flexible",
        callback: (token) => callbackRef.current(token),
        "expired-callback": () => callbackRef.current(""),
        "error-callback": () => callbackRef.current(""),
      });
    }).catch(() => { if (!disposed) callbackRef.current(""); });
    return () => {
      disposed = true;
      callbackRef.current("");
      if (widgetId !== undefined && window.turnstile) {
        try { window.turnstile.remove(widgetId); } catch { /* Page might be navigating. */ }
      }
    };
  }, [language, action]);
  if (!siteKey) return null;
  return <div className="wasteland-turnstile" ref={element} />;
}
