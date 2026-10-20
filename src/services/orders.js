import { supabase } from "../lib/supabase.js";

function mapOrder(row, items) {
  return {
    id: row.id,
    orderId: row.order_number,
    estado: row.estado,
    fuente: row.fuente,
    sucursal: row.sucursal,
    tipo: row.tipo,
    direccion: row.direccion || "",
    referencia: row.referencia || "",
    fecha: row.fecha,
    horario: row.horario,
    cliente: {
      nombre: row.cliente_nombre,
      telefono: row.cliente_telefono,
    },
    metodoPago: row.metodo_pago,
    observaciones: row.observaciones || "",
    total: row.total,
    items: items.map((i) => ({
      cartId: i.cart_id,
      productId: i.product_id,
      nombre: i.nombre,
      precio: i.precio,
      piezas: i.piezas,
      cat: i.cat,
      desc: i.desc_text || "",
      cambios: i.cambios || [],
      opcionesStr: i.opciones_str || "",
      obsModal: i.obs_modal || "",
      qty: i.qty,
    })),
    cart: [],
    timestamp: row.created_at,
  };
}

export async function fetchOrders() {
  // Las líneas se piden anidadas (join por la FK order_items.order_id) en vez
  // de con un .in() sobre los ids: esa lista viajaba en la URL y crecía con
  // cada pedido hasta superar el límite del gateway y devolver 400.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!orders.length) return [];

  return orders.map((o) => mapOrder(o, o.order_items || []));
}

export async function createOrder(order, { forzar = false } = {}) {
  // create_order() (security definer) es la única vía para crear pedidos:
  // asigna el número, calcula el total y guarda pedido e ítems en una sola
  // transacción.
  const items = (order.items || order.cart || []).map((i) => ({
    cartId: i.cartId,
    productId: i.productId,
    nombre: i.nombre,
    precio: i.precio,
    piezas: i.piezas,
    cat: i.cat,
    desc: i.desc || "",
    cambios: i.cambios || [],
    opcionesStr: i.opcionesStr || "",
    obsModal: i.obsModal || "",
    qty: i.qty || 1,
  }));

  const { data: row, error } = await supabase.rpc("create_order", {
    p_order: {
      estado: order.estado || "abierto",
      fuente: order.fuente || "web",
      sucursal: order.sucursal,
      tipo: order.tipo,
      direccion: order.direccion || "",
      referencia: order.referencia || "",
      fecha: order.fecha,
      horario: order.horario,
      cliente: {
        nombre: order.cliente?.nombre || "",
        telefono: order.cliente?.telefono || "",
      },
      metodoPago: order.metodoPago || "transferencia",
      observaciones: order.observaciones || "",
    },
    p_items: items,
    p_forzar: forzar,
  });
  if (error) throw error;

  return mapOrder(row, row.order_items || []);
}

// create_order rechaza con SL409 cuando el bloque horario está lleno.
// Devuelve { hora, pedidos, cupo } o null si el error es otro.
export function cupoLleno(error) {
  if (error?.code !== "SL409") return null;
  try {
    return JSON.parse(error.details);
  } catch {
    return { hora: null, pedidos: null, cupo: null };
  }
}

export async function updateOrderStatus(id, estado) {
  const { error } = await supabase
    .from("orders")
    .update({ estado })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(id) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

export async function updateOrder(id, changes) {
  const { error } = await supabase
    .from("orders")
    .update({
      estado: changes.estado,
      direccion: changes.direccion || "",
      horario: changes.horario,
      cliente_nombre: changes.cliente?.nombre || "",
      cliente_telefono: changes.cliente?.telefono || "",
      observaciones: changes.observaciones || "",
    })
    .eq("id", id);
  if (error) throw error;
}
