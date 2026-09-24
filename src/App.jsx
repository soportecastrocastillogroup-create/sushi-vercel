import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AuthProvider from "./context/AuthProvider.jsx";
import SiteLayout from "./components/site/SiteLayout.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LocalesPage from "./pages/LocalesPage.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

// El panel se descarga solo cuando se visita.
const PanelLayout = lazy(() => import("./panel/PanelLayout.jsx"));
const RequireAdmin = lazy(() => import("./panel/RequireAdmin.jsx"));
const UsersPage = lazy(() => import("./panel/UsersPage.jsx"));
const AccountPage = lazy(() => import("./panel/AccountPage.jsx"));
const CartaAdminPage = lazy(() => import("./panel/CartaAdminPage.jsx"));
const SitioAdminPage = lazy(() => import("./panel/SitioAdminPage.jsx"));
const sections = () => import("./panel/sections.jsx");
const OrdersSection = lazy(() => sections().then((m) => ({ default: m.OrdersSection })));
const NewOrderSection = lazy(() => sections().then((m) => ({ default: m.NewOrderSection })));
const KitchenSection = lazy(() => sections().then((m) => ({ default: m.KitchenSection })));
const ReportsSection = lazy(() => sections().then((m) => ({ default: m.ReportsSection })));

const fallback = (
  <div className="page-state" role="status">
    <span className="spinner" aria-hidden="true" />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={fallback}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="carta" element={<MenuPage />} />
              <Route path="locales" element={<LocalesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="login" element={<LoginPage />} />
            <Route path="panel" element={<PanelLayout />}>
              <Route index element={<Navigate to="pedidos" replace />} />
              <Route path="pedidos" element={<OrdersSection />} />
              <Route path="nuevo-pedido" element={<NewOrderSection />} />
              <Route path="cocina" element={<KitchenSection />} />
              <Route path="carta" element={<RequireAdmin><CartaAdminPage /></RequireAdmin>} />
              <Route path="sitio" element={<RequireAdmin><SitioAdminPage /></RequireAdmin>} />
              <Route path="reportes" element={<RequireAdmin><ReportsSection /></RequireAdmin>} />
              <Route path="usuarios" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
              <Route path="cuenta" element={<AccountPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
