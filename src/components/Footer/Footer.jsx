import { Crown, UserRound } from "lucide-react";

import Container from "../Container/Container.jsx";

import "./Footer.css";

function resolveFooterCopy(baseCopy, siteSettings, language) {
  const custom = siteSettings?.footerByLanguage?.[language] || {};
  const copy = { ...baseCopy };

  Object.entries(custom).forEach(([key, value]) => {
    if (typeof value === "string") {
      copy[key] = value;
    }
  });

  if (siteSettings?.brandText) {
    copy.brand = siteSettings.brandText;
  }

  return copy;
}

function Footer({ t, language, siteSettings }) {
  const copy = resolveFooterCopy(t.footer, siteSettings, language);

  return (
    <footer className="footer">
      <div className="footer__overlay" />

      <Container className="footer__container">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__brand-icon">
              <Crown size={28} />
            </div>

            <div>
              <h2>{copy.brand}</h2>
              {copy.description && <p>{copy.description}</p>}
            </div>
          </div>

          <div className="footer__author">
            <div className="footer__author-icon">
              <UserRound size={24} />
            </div>

            <div>
              {copy.authorLabel && (
                <span className="footer__author-label">{copy.authorLabel}</span>
              )}
              {copy.author && <strong>{copy.author}</strong>}
              {copy.authorDescription && <p>{copy.authorDescription}</p>}
              {copy.projectDescription && <p>{copy.projectDescription}</p>}
            </div>
          </div>
        </div>

        {copy.copyright && (
          <div className="footer__bottom">
            <p>{copy.copyright}</p>
          </div>
        )}
      </Container>
    </footer>
  );
}

export default Footer;
