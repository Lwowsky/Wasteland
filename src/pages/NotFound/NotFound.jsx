import { Link, useParams } from "react-router-dom";

import Container from "../../components/Container/Container.jsx";
import PageMeta from "../../components/PageMeta/PageMeta.jsx";

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../../config/site.js";

import translations from "../../i18n/index.js";

import "./NotFound.css";

function NotFound() {
  const { lang } = useParams();

  const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  const t = translations[language];

  return (
    <>
      <PageMeta
        title={t.seo.notFound.title}
        description={t.seo.notFound.description}
        noIndex
      />

      <main className="page not-found">
        <Container className="not-found__container">
          <h1 className="not-found__title">{t.notFound.title}</h1>

          <p className="not-found__text">{t.notFound.text}</p>

          <Link className="not-found__button" to={`/${language}`}>
            {t.notFound.backHome}
          </Link>
        </Container>
      </main>
    </>
  );
}

export default NotFound;
