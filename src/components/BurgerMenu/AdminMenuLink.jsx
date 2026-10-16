import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { ROUTES, getRoute } from "../../config/routes.js";
import { hasAdminMenuHint } from "../../features/auth/adminMenuHint.js";
import { publicAsset } from "../../utils/publicAsset.js";

// Opening the public menu never initializes Firebase or reads Firestore.
// This hint controls only whether the link is shown; AdminRoute independently
// performs the authoritative permissions check when a user enters /admin.
function AdminMenuLink({ t, language, onClose }) {
  if (!hasAdminMenuHint()) return null;

  return (
    <>
      <div className="burger-menu__divider" />
      <NavLink
        to={getRoute(language, ROUTES.admin)}
        onClick={onClose}
        className="burger-menu__link burger-menu__admin"
      >
        <span className="burger-menu__icon">
          <img
            src={publicAsset("/images/admin/icons/admin.webp")}
            alt=""
            aria-hidden="true"
          />
        </span>
        <span className="burger-menu__label">{t.header.admin}</span>
        <ChevronRight className="burger-menu__arrow" size={20} />
      </NavLink>
    </>
  );
}

export default AdminMenuLink;
