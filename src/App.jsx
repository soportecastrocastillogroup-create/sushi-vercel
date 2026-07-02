import { useState } from "react";
import { useCatalog } from "./hooks/useCatalog.js";
import { useSettings } from "./hooks/useSettings.js";
import { useOrders } from "./hooks/useOrders.js";
import { useStockAndDates } from "./hooks/useStockAndDates.js";
import GlobalStyles from "./components/layout/GlobalStyles.jsx";
import AppNav from "./components/layout/AppNav.jsx";
import PinModal from "./components/shared/PinModal.jsx";
import CustomerView from "./components/customer/CustomerView.jsx";
import AdminView from "./components/admin/AdminView.jsx";
import KitchenView from "./components/kitchen/KitchenView.jsx";
import ReportesView from "./components/reportes/ReportesView.jsx";

export default function App() {
  const [view, setView] = useState("customer");
  const [pinTarget, setPinTarget] = useState(null);
  const [adminOk, setAdminOk] = useState(false);
  const [kitchenOk, setKitchenOk] = useState(false);
  const [reportesOk, setReportesOk] = useState(false);

  const { menu, customizations, branches, loading: catalogLoading, error: catalogError, reload: reloadCatalog } = useCatalog();
  const { settings, loading: settingsLoading, error: settingsError, reload: reloadSettings } = useSettings();
  const {
    stock,
    diasDesbloqueados,
    loading: stockLoading,
    error: stockError,
    reload: reloadStock,
    toggleStock,
    toggleDia,
  } = useStockAndDates();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    reload: reloadOrders,
    addOrder,
    updStatus,
    delOrder,
    updOrder,
  } = useOrders(settings?.costoDelivery ?? 0);

  const loaded = !catalogLoading && !settingsLoading && !stockLoading && !ordersLoading;
  const loadError = catalogError || settingsError || stockError || ordersError;

  const refreshAll = () => {
    reloadCatalog();
    reloadSettings();
    reloadStock();
    reloadOrders();
  };

  const navigate = (t) => {
    if (t === "admin" && !adminOk) return setPinTarget("admin");
    if (t === "kitchen" && !kitchenOk) return setPinTarget("kitchen");
    if (t === "reportes" && !reportesOk) return setPinTarget("reportes");
    setView(t);
  };

  const onPinOk = () => {
    if (pinTarget === "admin") setAdminOk(true);
    if (pinTarget === "kitchen") setKitchenOk(true);
    if (pinTarget === "reportes") setReportesOk(true);
    setView(pinTarget);
    setPinTarget(null);
  };

  const pending = orders.filter((o) => o.estado === "abierto").length;

  if (!loaded) {
    return (
      <div
        style={{
          background: "#0A0D0A",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 40 }}>🍣</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          background: "#0A0D0A",
          minHeight: "100vh",
          color: "#F0EBE0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🍣</div>
          <p style={{ color: "#C06060", marginBottom: 8 }}>
            Error al cargar datos
          </p>
          <p style={{ color: "#607060", fontSize: 13, marginBottom: 16 }}>
            {loadError}
          </p>
          <p style={{ color: "#405040", fontSize: 12, marginBottom: 16 }}>
            Verificá que ejecutaste supabase/schema.sql y configuraste
            VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
          </p>
          <button
            onClick={refreshAll}
            style={{
              padding: "10px 20px",
              background: "#C9A84C",
              border: "none",
              borderRadius: 8,
              color: "#0A0D0A",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const nav = [
    { id: "customer", label: "📱 Pedido", public: true },
    {
      id: "admin",
      label: pending > 0 ? `📋 Admin (${pending})` : "📋 Admin",
      public: false,
    },
    { id: "kitchen", label: "👨‍🍳 Cocina", public: false },
    { id: "reportes", label: "📊 Reportes", public: false },
  ];

  const sharedProps = { menu, customizations, settings, branches };

  return (
    <div style={{ background: "#0A0D0A", minHeight: "100vh", color: "#F0EBE0" }}>
      <GlobalStyles />
      <AppNav view={view} nav={nav} onNavigate={navigate} />
      {view === "customer" && (
        <CustomerView
          onAddOrder={addOrder}
          stock={stock}
          orders={orders}
          diasDesbloqueados={diasDesbloqueados}
          {...sharedProps}
        />
      )}
      {view === "admin" && (
        <AdminView
          orders={orders}
          onAddOrder={addOrder}
          onStatusChange={updStatus}
          onDeleteOrder={delOrder}
          onUpdateOrder={updOrder}
          stock={stock}
          onToggleStock={toggleStock}
          diasDesbloqueados={diasDesbloqueados}
          onToggleDia={toggleDia}
          onRefresh={refreshAll}
          {...sharedProps}
        />
      )}
      {view === "kitchen" && (
        <KitchenView
          orders={orders}
          onStatusChange={updStatus}
          onRefresh={refreshAll}
          {...sharedProps}
        />
      )}
      {view === "reportes" && (
        <ReportesView orders={orders} {...sharedProps} />
      )}
      {pinTarget && (
        <PinModal
          target={pinTarget}
          onSuccess={onPinOk}
          onClose={() => setPinTarget(null)}
          settings={settings}
        />
      )}
    </div>
  );
}
