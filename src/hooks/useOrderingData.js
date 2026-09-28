import { useCatalog } from "./useCatalog.js";
import { useSettings } from "./useSettings.js";
import { useOrders } from "./useOrders.js";
import { useStockAndDates } from "./useStockAndDates.js";

// Todo lo que necesitan el flujo de pedido y el panel. Antes vivía en App.jsx.
export function useOrderingData() {
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

  return {
    menu,
    customizations,
    branches,
    settings,
    stock,
    diasDesbloqueados,
    orders,
    toggleStock,
    toggleDia,
    addOrder,
    updStatus,
    delOrder,
    updOrder,
    loaded,
    loadError,
    refreshAll,
  };
}
