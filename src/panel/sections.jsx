import { useOutletContext } from "react-router";
import AdminView from "../components/admin/AdminView.jsx";
import CustomerView from "../components/customer/CustomerView.jsx";
import KitchenView from "../components/kitchen/KitchenView.jsx";
import ReportesView from "../components/reportes/ReportesView.jsx";

// Vistas heredadas montadas en las rutas del panel. Reciben los datos de
// useOrderingData() a través del Outlet de PanelLayout.

const shared = (d) => ({ menu: d.menu, customizations: d.customizations, settings: d.settings, branches: d.branches });

export function OrdersSection() {
  const d = useOutletContext();
  return (
    <AdminView
      orders={d.orders}
      onAddOrder={d.addOrder}
      onStatusChange={d.updStatus}
      onDeleteOrder={d.delOrder}
      onUpdateOrder={d.updOrder}
      stock={d.stock}
      onToggleStock={d.toggleStock}
      diasDesbloqueados={d.diasDesbloqueados}
      onToggleDia={d.toggleDia}
      onRefresh={d.refreshAll}
      {...shared(d)}
    />
  );
}

export function NewOrderSection() {
  const d = useOutletContext();
  return (
    <CustomerView
      onAddOrder={d.addOrder}
      stock={d.stock}
      orders={d.orders}
      diasDesbloqueados={d.diasDesbloqueados}
      {...shared(d)}
    />
  );
}

export function KitchenSection() {
  const d = useOutletContext();
  return <KitchenView orders={d.orders} onStatusChange={d.updStatus} onRefresh={d.refreshAll} {...shared(d)} />;
}

export function ReportsSection() {
  const d = useOutletContext();
  return <ReportesView orders={d.orders} {...shared(d)} />;
}
