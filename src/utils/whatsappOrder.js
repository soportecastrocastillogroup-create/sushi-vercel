import { fmt } from "./format.js";

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
