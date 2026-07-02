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
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!orders.length) return [];

  const { data: items, error: iErr } = await supabase
    .from("order_items")
    .select("*")
    .in(
      "order_id",
      orders.map((o) => o.id)
    );
  if (iErr) throw iErr;

  const byOrder = {};
  for (const item of items) {
    if (!byOrder[item.order_id]) byOrder[item.order_id] = [];
    byOrder[item.order_id].push(item);
  }

  return orders.map((o) => mapOrder(o, byOrder[o.id] || []));
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
