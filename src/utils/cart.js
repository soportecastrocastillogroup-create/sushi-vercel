export const cambiosCosto = (cambios = []) =>
  cambios.reduce((s, c) => s + c.precio, 0);

export const itemTotal = (item) =>
  (item.precio + cambiosCosto(item.cambios)) * item.qty;

export const cartSubtotal = (cart) => cart.reduce((s, i) => s + itemTotal(i), 0);

export const cartTotal = (cart, tipo, costoDelivery = 0) =>
  cartSubtotal(cart) + (tipo === "delivery" ? costoDelivery : 0);
