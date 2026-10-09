import { ShieldX } from "lucide-react";
import { Link, useOutletContext, useParams } from "react-router-dom";

import "./AccessDenied.css";

function AccessDenied() {
  const { lang } = useParams();
  const { t } = useOutletContext();
  const copy = t.auth.accessDenied;

  return (
    <main className="access-denied-page">
      <div className="access-denied-card">
        <div className="access-denied-card__icon">
          <ShieldX size={34} />
        </div>

        <h1>{copy.title}</h1>
        <p>{copy.text}</p>

        <Link to={`/${lang}`} className="access-denied-card__button">
          {copy.home}
        </Link>
      </div>
    </main>
  );
}

export default AccessDenied;
