import { NavLink } from "react-router-dom";

import useAdminAuth from "../../features/auth/useAdminAuth.js";
import { ROUTES, getRoute } from "../../config/routes.js";
import { publicAsset } from "../../utils/publicAsset.js";
import { ChevronRight } from "lucide-react";

// The Firebase/Firestore admin check is loaded only after opening the menu.
// AdminRoute remains the authoritative guard for the actual admin page.
function AdminMenuLink({ t, language, onClose }) {
  const { isAdmin } = useAdminAuth();

  if (!isAdmin) return null;

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
