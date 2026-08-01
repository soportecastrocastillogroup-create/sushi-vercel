import { supabase } from "../lib/supabase.js";
import { cartTotal } from "../utils/cart.js";

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

export async function createOrder(order, costoDelivery) {
  const { data: orderNumber, error: numErr } = await supabase.rpc(
    "get_next_order_number"
  );
  if (numErr) throw numErr;

  const total = cartTotal(order.items || order.cart, order.tipo, costoDelivery);

  const { data: row, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      estado: order.estado || "abierto",
      fuente: order.fuente || "web",
      sucursal: order.sucursal,
      tipo: order.tipo,
      direccion: order.direccion || "",
      referencia: order.referencia || "",
      fecha: order.fecha,
      horario: order.horario,
      cliente_nombre: order.cliente?.nombre || "",
      cliente_telefono: order.cliente?.telefono || "",
      metodo_pago: order.metodoPago || "transferencia",
      observaciones: order.observaciones || "",
      total,
    })
    .select()
    .single();
  if (error) throw error;

  const items = (order.items || order.cart || []).map((i) => ({
    order_id: row.id,
    cart_id: i.cartId,
    product_id: i.productId,
    nombre: i.nombre,
    precio: i.precio,
    piezas: i.piezas,
    cat: i.cat,
    desc_text: i.desc || "",
    cambios: i.cambios || [],
    opciones_str: i.opcionesStr || "",
    obs_modal: i.obsModal || "",
    qty: i.qty || 1,
  }));

  if (items.length) {
    const { error: iErr } = await supabase.from("order_items").insert(items);
    if (iErr) throw iErr;
  }

  return mapOrder(row, items);
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
