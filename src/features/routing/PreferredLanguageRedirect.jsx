import { Navigate, useLocation, useParams } from "react-router-dom";

import { ROUTES } from "../../config/routes.js";
import { SUPPORTED_LANGUAGES } from "../../config/site.js";
import { resolvePreferredLanguage } from "../../utils/language.js";

// A client-only redirect: 0 Worker calls, 0 D1 reads.
// Preserve ?access=... and other search/hash data on canonicalization.
export default function PreferredLanguageRedirect({ route = ROUTES.home }) {
  const { lang } = useParams();
  const location = useLocation();
  const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : resolvePreferredLanguage();
  return (
    <Navigate
      replace
      to={{
        pathname: `/${language}${route ? `/${route}` : ""}`,
        search: location.search,
        hash: location.hash,
      }}
    />
  );
}
