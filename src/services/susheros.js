import { supabase } from "../lib/supabase.js";

// Susheros: fichas de clientes para el administrador (PRD 02 · 5.6). RLS solo
// deja leerlas al administrador; las cuentas se gestionan con manage-customers.

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export async function fetchSusheros() {
  const [customers, stats] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("customer_stats").select("*"),
  ]);
  const porId = new Map(must(stats).map((s) => [s.customer_id, s]));
  return must(customers).map((c) => ({ ...c, stats: porId.get(c.id) ?? { compras: 0, gasto: 0, ticket_promedio: 0, en_curso: 0 } }));
}

export const fetchCustomerOrders = async (customerId) =>
  must(
    await supabase
      .from("orders")
      .select("id, order_number, estado, fuente, sucursal, tipo, fecha, horario, total, metodo_pago, order_items(nombre, qty, opciones_str)")
      .eq("customer_id", customerId)
      .order("fecha", { ascending: false })
      .order("horario", { ascending: false })
  );

export const saveNotas = async (id, notas) =>
  must(await supabase.from("customers").update({ notas, updated_at: new Date().toISOString() }).eq("id", id));

async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("manage-customers", { body: { action, ...payload } });
  if (error) {
    let message = "No pudimos completar la acción.";
    try {
      const body = await error.context?.json();
      if (body?.error) message = body.error;
    } catch {
      // respuesta sin JSON
    }
    throw new Error(message);
  }
  return data;
}

export const resetCustomerPassword = (customer_id, password) => call("reset_password", { customer_id, password });
export const setCustomerBlocked = (customer_id, bloqueado) => call("set_blocked", { customer_id, bloqueado });
export const updateCustomerEmail = (customer_id, email) => call("update_email", { customer_id, email });
