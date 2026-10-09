import { useContext, useEffect } from "react";

import {
  DEFAULT_LANGUAGE,
  SITE_NAME,
  SITE_URL,
  SUPPORTED_LANGUAGES,
} from "../../config/site.js";
import SiteSettingsContext from "../../features/site/SiteSettingsContext.jsx";

function PageMeta({
  title,
  description,
  language,
  path = "",
  noIndex = false,
}) {
  const siteSettings = useContext(SiteSettingsContext);
  const siteName = siteSettings?.siteName || SITE_NAME;

  useEffect(() => {
    document.title = `${title} | ${siteName}`;

    let metaDescription = document.querySelector('meta[name="description"]');

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }

    metaDescription.content = description;

    let robots = document.querySelector('meta[name="robots"]');

    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }

    robots.content = noIndex ? "noindex, nofollow" : "index, follow";

    const canonical = document.querySelector('link[rel="canonical"]');

    const alternateLinks = document.querySelectorAll(
      'link[rel="alternate"][hreflang]',
    );

    if (noIndex || !language) {
      canonical?.remove();

      alternateLinks.forEach((link) => {
        link.remove();
      });

      return;
    }

    const cleanPath = path ? `/${path}` : "";
    const siteOrigin = SITE_URL || window.location.origin;
    const canonicalUrl = `${siteOrigin}/${language}${cleanPath}`;

    let canonicalLink = canonical;

    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }

    canonicalLink.href = canonicalUrl;

    alternateLinks.forEach((link) => {
      link.remove();
    });

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const link = document.createElement("link");

      link.rel = "alternate";
      link.hreflang = lang;
      link.href = `${siteOrigin}/${lang}${cleanPath}`;

      document.head.appendChild(link);
    });

    const defaultLink = document.createElement("link");

    defaultLink.rel = "alternate";
    defaultLink.hreflang = "x-default";
    defaultLink.href = `${siteOrigin}/${DEFAULT_LANGUAGE}${cleanPath}`;

    document.head.appendChild(defaultLink);
  }, [title, description, language, path, noIndex, siteName]);

  return null;
}

export default PageMeta;
