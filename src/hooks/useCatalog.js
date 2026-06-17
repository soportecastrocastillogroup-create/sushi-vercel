import { useState, useEffect, useCallback } from "react";
import { fetchMenu, fetchCustomizations, fetchBranches } from "../services/catalog.js";

export function useCatalog() {
  const [menu, setMenu] = useState([]);
  const [customizations, setCustomizations] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [m, c, b] = await Promise.all([
        fetchMenu(),
        fetchCustomizations(),
        fetchBranches(),
      ]);
      setMenu(m);
      setCustomizations(c);
      setBranches(b);
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

  return { menu, customizations, branches, loading, error, reload: load };
}
