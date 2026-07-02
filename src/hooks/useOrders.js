import { useState, useEffect, useCallback } from "react";
import {
  fetchOrders,
  createOrder as createOrderService,
  updateOrderStatus as updateStatusService,
  deleteOrder as deleteOrderService,
  updateOrder as updateOrderService,
} from "../services/orders.js";

export function useOrders(costoDelivery = 0) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
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

  const addOrder = useCallback(
    async (order) => {
      const created = await createOrderService(order, costoDelivery);
      setOrders((prev) => [created, ...prev]);
      return created;
    },
    [costoDelivery]
  );

  const updStatus = useCallback(async (id, estado) => {
    await updateStatusService(id, estado);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estado } : o))
    );
  }, []);

  const delOrder = useCallback(async (id) => {
    await deleteOrderService(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const updOrder = useCallback(async (id, changes) => {
    await updateOrderService(id, changes);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...changes } : o))
    );
  }, []);

  return {
    orders,
    loading,
    error,
    reload: load,
    addOrder,
    updStatus,
    delOrder,
    updOrder,
  };
}
