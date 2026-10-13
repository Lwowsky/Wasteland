import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import RouteLoading from "./components/RouteLoading/RouteLoading.jsx";
import { ROUTES } from "./config/routes.js";
import { resolvePreferredLanguage } from "./utils/language.js";

const MainLayout = lazy(() => import("./layouts/MainLayout.jsx"));
const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Registration = lazy(() => import("./pages/Registration/Registration.jsx"));
const Players = lazy(() => import("./pages/Players/Players.jsx"));
const FinalPlan = lazy(() => import("./pages/FinalPlan/FinalPlan.jsx"));
const Settings = lazy(() => import("./pages/Settings/Settings.jsx"));
const Login = lazy(() => import("./pages/Auth/Login/Login.jsx"));
const AccessDenied = lazy(() =>
  import("./pages/Auth/AccessDenied/AccessDenied.jsx"),
);
const NotFound = lazy(() => import("./pages/NotFound/NotFound.jsx"));
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

        <Route path="/:lang" element={<MainLayout />}>
          <Route index element={<Home />} />

          <Route path={ROUTES.registration} element={<Registration />} />

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
