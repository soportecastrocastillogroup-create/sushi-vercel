import { supabase } from "../lib/supabase.js";

// Cuentas de clientes y pedido online (PRD 02 · Etapa 5). La ficha la crea un
// trigger al registrarse; el pedido lo valida y calcula create_order().

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const normalizeEmail = (e) => String(e ?? "").trim().toLowerCase();
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function signUpCustomer({ email, password, nombre, telefono, direccion, referencia, sucursal_preferida, acepta_marketing }) {
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: {
        tipo: "cliente",
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        referencia: referencia.trim(),
        sucursal_preferida,
        acepta_marketing: !!acepta_marketing,
      },
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw new Error("Ya existe una cuenta con ese correo. Ingresa con tu contraseña.");
    if (/password/i.test(error.message)) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    throw new Error("No pudimos crear tu cuenta. Intenta nuevamente.");
  }
  // Sin confirmación de correo, signUp devuelve la sesión al tiro.
  if (!data.session) throw new Error("Tu cuenta quedó creada, pero hay que confirmarla. Escríbenos por WhatsApp.");
  return data;
}

export const updateMyCustomer = async (datos) => must(await supabase.rpc("update_my_customer", { p_datos: datos }));

export async function changeMyPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(/different/i.test(error.message) ? "La contraseña nueva debe ser distinta de la actual." : error.message);
}

export const fetchMyOrders = async () =>
  must(
    await supabase
      .from("orders")
      .select("id, order_number, estado, sucursal, tipo, fecha, horario, total, metodo_pago, created_at, order_items(nombre, qty, opciones_str)")
      .order("created_at", { ascending: false })
      .limit(30)
  );

// Cupos por franja de una sucursal y fecha: [{ slot, hora, pedidos, cupo, disponible }].
export const fetchAvailableSlots = async (sucursal, fecha) =>
  must(await supabase.rpc("available_slots", { p_sucursal: sucursal, p_fecha: fecha }));

export const fetchUnlockedDates = async () => must(await supabase.from("unlocked_dates").select("date")).map((d) => d.date);

// Pedido de un cliente: del carrito solo viajan producto, cantidad y opciones;
// precios y nombres los pone la base.
export async function createCustomerOrder(order, items) {
  return must(
    await supabase.rpc("create_order", {
      p_order: order,
      p_items: items.map((i) => ({ cartId: i.key, productId: i.productId, qty: i.qty, opciones: i.opciones })),
    })
  );
}
