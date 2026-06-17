import { useState, useEffect, useCallback } from "react";
import { fetchStock, toggleStock as toggleStockService } from "../services/stock.js";
import {
  fetchUnlockedDates,
  toggleUnlockedDate as toggleDateService,
} from "../services/dates.js";

export function useStockAndDates() {
  const [stock, setStock] = useState({});
  const [diasDesbloqueados, setDiasDesbloqueados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, d] = await Promise.all([fetchStock(), fetchUnlockedDates()]);
      setStock(s);
      setDiasDesbloqueados(d);
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

  const toggleStock = useCallback(async (productId) => {
    const next = stock[productId] === false;
    await toggleStockService(productId, next);
    setStock((prev) => ({ ...prev, [productId]: next }));
  }, [stock]);

  const toggleDia = useCallback(
    async (iso) => {
      const add = !diasDesbloqueados.includes(iso);
      await toggleDateService(iso, add);
      setDiasDesbloqueados((prev) =>
        add ? [...prev, iso] : prev.filter((d) => d !== iso)
      );
    },
    [diasDesbloqueados]
  );

  return {
    stock,
    diasDesbloqueados,
    loading,
    error,
    reload: load,
    toggleStock,
    toggleDia,
  };
}
