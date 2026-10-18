import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import RouteLoading from "./components/RouteLoading/RouteLoading.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import { LANGUAGELESS_ROUTE_ALIASES, ROUTES } from "./config/routes.js";
import PreferredLanguageRedirect from "./features/routing/PreferredLanguageRedirect.jsx";
import { resolvePreferredLanguage } from "./utils/language.js";

const StaticShareRedirect = lazy(() => import("./features/contentAccess/StaticShareRedirect.jsx"));
const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Registration = lazy(() => import("./pages/Registration/Registration.jsx"));
const Players = lazy(() => import("./pages/Players/Players.jsx"));
const FinalPlan = lazy(() => import("./pages/FinalPlan/FinalPlan.jsx"));
const Settings = lazy(() => import("./pages/Settings/Settings.jsx"));
const Login = lazy(() => import("./pages/Auth/Login/Login.jsx"));
const AccessDenied = lazy(() =>
  import("./pages/Auth/AccessDenied/AccessDenied.jsx"),
);
const AdminRoute = lazy(() => import("./features/auth/AdminRoute.jsx"));
const ContentAccessGate = lazy(() =>
  import("./features/contentAccess/ContentAccessGate.jsx"),
);
const Admin = lazy(() => import("./pages/Admin/Admin.jsx"));

function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={`/${resolvePreferredLanguage()}`} replace />}
        />

        <Route path="/s/:shortCode" element={<StaticShareRedirect />} />

        {Object.entries(LANGUAGELESS_ROUTE_ALIASES).map(([segment, target]) => (
          <Route
            key={segment}
            path={`/${segment}`}
            element={<PreferredLanguageRedirect route={target} />}
          />
        ))}

        <Route path="/:lang" element={<MainLayout />}>
          <Route index element={<Home />} />

          <Route path={ROUTES.registration} element={<Registration />} />
          <Route path="player" element={<PreferredLanguageRedirect route={ROUTES.players} />} />

          <Route
            path={ROUTES.players}
            element={
              <ContentAccessGate resource="players">
                <Players />
              </ContentAccessGate>
            }
          />

          <Route
            path={ROUTES.finalPlan}
            element={
              <ContentAccessGate resource="final_plan">
                <FinalPlan />
              </ContentAccessGate>
            }
          />

          <Route path={ROUTES.settings} element={<Settings />} />

          <Route path="login" element={<Login />} />

          <Route path="access-denied" element={<AccessDenied />} />

          <Route element={<AdminRoute />}>
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
