import { useCallback, useEffect, useMemo, useState } from "react";
import { CartContext } from "./cart-context.js";

// Carrito de la carta pública. Se guarda en el navegador para que no se pierda
// al recargar; no es un pedido hasta que el cliente lo envía por WhatsApp.
const STORAGE_KEY = "sushiloncoche.cart.v1";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.items)) return parsed;
  } catch {
    // localStorage no disponible o dato corrupto: se parte vacío.
  }
  return { items: [], branch: null };
}

const lineKey = (productId, opciones) => `${productId}|${opciones.join("|")}`;

export default function CartProvider({ children }) {
  const [state, setState] = useState(readStored);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sin persistencia: el carrito sigue funcionando en memoria.
    }
  }, [state]);

  const add = useCallback((product, { qty = 1, opciones = [] } = {}) => {
    const key = lineKey(product.id, opciones);
    setState((s) => {
      const existing = s.items.find((i) => i.key === key);
      const items = existing
        ? s.items.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
        : [
            ...s.items,
            {
              key,
              productId: product.id,
              nombre: product.nombre,
              precio: product.precio,
              desc: product.desc || "",
              opciones,
              qty,
            },
          ];
      return { ...s, items };
    });
  }, []);

  const setQty = useCallback((key, qty) => {
    setState((s) => ({
      ...s,
      items: qty <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, qty } : i)),
    }));
  }, []);

  const clear = useCallback(() => setState((s) => ({ ...s, items: [] })), []);

  // Cambiar de sucursal quita los productos que esa sucursal no ofrece.
  const setBranch = useCallback((branch, menu = []) => {
    setState((s) => {
      const valid = new Set(menu.filter((m) => m.sucursales.includes(branch)).map((m) => m.id));
      return {
        branch,
        items: menu.length ? s.items.filter((i) => valid.has(i.productId)) : s.items,
      };
    });
  }, []);

  const value = useMemo(() => {
    const count = state.items.reduce((n, i) => n + i.qty, 0);
    const subtotal = state.items.reduce((n, i) => n + i.precio * i.qty, 0);
    return {
      items: state.items,
      branch: state.branch,
      count,
      subtotal,
      add,
      setQty,
      clear,
      setBranch,
      open,
      setOpen,
    };
  }, [state, open, add, setQty, clear, setBranch]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
