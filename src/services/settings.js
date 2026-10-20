import { supabase } from "../lib/supabase.js";

export async function fetchSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("costo_delivery, whatsapp_num, max_cambios, alerta_pedidos")
    .eq("id", 1)
    .single();
  if (error) throw error;

  const { data: slots, error: sErr } = await supabase
    .from("time_slots")
    .select("slot")
    .order("sort_order");
  if (sErr) throw sErr;

  const { data: blocked, error: bErr } = await supabase
    .from("blocked_weekdays")
    .select("dow");
  if (bErr) throw bErr;

  const { data: branches, error: brErr } = await supabase
    .from("branches")
    .select("name, cupo_por_hora");
  if (brErr) throw brErr;

  return {
    costoDelivery: data.costo_delivery,
    whatsappNum: data.whatsapp_num,
    maxCambios: data.max_cambios,
    // Cupo de pedidos por bloque de una hora, por sucursal: { "La Paz": 4 }.
    cupoPorHora: Object.fromEntries(branches.map((b) => [b.name, b.cupo_por_hora])),
    alertaPedidos: data.alerta_pedidos,
    timeSlots: slots.map((s) => s.slot),
    blockedWeekdays: blocked.map((b) => b.dow),
  };
}
