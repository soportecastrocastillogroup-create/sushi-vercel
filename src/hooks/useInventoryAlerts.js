import { useCallback, useEffect, useState } from "react";
import { fetchCriticalAlerts } from "../services/inventory.js";

// Insumos críticos en rojo (todas las sucursales), para el badge del menú.
// Si falla, no bloquea el panel: el badge simplemente no aparece.
export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCriticalAlerts()
      .then((a) => !cancelled && setAlerts(a))
      .catch(() => !cancelled && setAlerts([]));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { alerts, refresh };
}
