import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";

import translations from "../../i18n/index.js";

import useAdminAuth from "./useAdminAuth.js";

function AdminRoute() {
  const { user, admin, loading } = useAdminAuth();

  const { lang } = useParams();

  const location = useLocation();

  const language = translations[lang] ? lang : "en";

  const t = translations[language].admin;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {t.common.checkingAccess}
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/${language}/login`}
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (!admin) {
    return <Navigate to={`/${language}/access-denied`} replace />;
  }

  return (
    <Outlet
      context={{
        user,
        admin,
      }}
    />
  );
}

export default AdminRoute;
