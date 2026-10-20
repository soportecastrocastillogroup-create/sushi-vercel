import { fmt } from "./format.js";
import { formatFecha } from "./dates.js";

// Mensaje de pedido que el cliente envía por WhatsApp desde la carta pública.
export function buildOrderMessage({ items, branch, tipo, nombre, direccion, comentarios, costoDelivery }) {
  const despacho = tipo === "delivery" ? costoDelivery || 0 : 0;
  const subtotal = items.reduce((n, i) => n + i.precio * i.qty, 0);

  const lineas = items
    .map((i) => {
      let l = `• ${i.qty}× ${i.nombre} — ${fmt(i.precio * i.qty)}`;
      if (i.opciones.length) l += `\n   ${i.opciones.join(" · ")}`;
      return l;
    })
    .join("\n");

  return [
    "¡Hola Sushi Loncoche! Quiero hacer un pedido 🍣",
    "",
    `Nombre: ${nombre.trim()}`,
    `Sucursal: ${branch}`,
    `Tipo: ${tipo === "delivery" ? "Delivery" : "Retiro en local"}`,
    tipo === "delivery" ? `Dirección: ${direccion.trim()}` : null,
    "",
    "Pedido:",
    lineas,
    despacho ? `• Despacho: ${fmt(despacho)}` : null,
    "",
    `Total: ${fmt(subtotal + despacho)}`,
    comentarios.trim() ? `\nComentarios: ${comentarios.trim()}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

// Mensaje de un pedido ya guardado desde una cuenta (con número de pedido).
// Usa lo que devolvió create_order: los precios son los de la base.
export function buildAccountOrderMessage(order, pagoLabel) {
  const items = order.order_items
    .map((i) => {
      let l = `• ${i.qty}× ${i.nombre} — ${fmt(i.precio * i.qty)}`;
      if (i.opciones_str) l += `\n   ${i.opciones_str}`;
      return l;
    })
    .join("\n");
  const subtotal = order.order_items.reduce((n, i) => n + i.precio * i.qty, 0);
  const despacho = order.total - subtotal;
  return [
    `¡Hola Sushi Loncoche! Hice el pedido ${order.order_number} desde mi cuenta 🍣`,
    "",
    `Nombre: ${order.cliente_nombre}`,
    `Sucursal: ${order.sucursal}`,
    `Tipo: ${order.tipo === "delivery" ? "Delivery" : "Retiro en local"}`,
    `Día y hora: ${formatFecha(order.fecha)} a las ${order.horario}`,
    order.tipo === "delivery" ? `Dirección: ${order.direccion}${order.referencia ? ` (${order.referencia})` : ""}` : null,
    `Pago: ${pagoLabel}`,
    "",
    "Pedido:",
    items,
    despacho > 0 ? `• Despacho: ${fmt(despacho)}` : null,
    "",
    `Total: ${fmt(order.total)}`,
    order.observaciones ? `\nComentarios: ${order.observaciones}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

