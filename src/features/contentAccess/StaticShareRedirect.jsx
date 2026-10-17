import { Navigate, useParams } from "react-router-dom";
import { resolvePreferredLanguage } from "../../utils/language.js";

// Routing only; authorization happens on the target page using the SHA-256
// hash from the static snapshot. Never trust a URL code for admin access.
export default function StaticShareRedirect() {
  const { shortCode = "" } = useParams();
  const resource = shortCode[0] === "p" ? "players" : shortCode[0] === "f" ? "final-plan" : "";
  const code = shortCode.slice(1);
  if (!resource || !/^[A-Za-z0-9_-]{16}$/.test(code)) {
    return <Navigate to={`/${resolvePreferredLanguage()}`} replace />;
  }
  return <Navigate to={`/${resolvePreferredLanguage()}/${resource}?access=${encodeURIComponent(code)}`} replace />;
}
