import { useCallback, useEffect, useState } from "react";
import { fetchBranches, fetchMenu } from "../services/catalog.js";
import { fetchStock } from "../services/stock.js";

// Datos de solo lectura para la carta pública: productos, sucursales y stock.
// No descarga pedidos ni configuración interna.
export function usePublicMenu() {
  const [data, setData] = useState({ menu: [], branches: [], stock: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [menu, branches, stock] = await Promise.all([fetchMenu(), fetchBranches(), fetchStock()]);
      setData({ menu, branches, stock });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, reload: load };
}
