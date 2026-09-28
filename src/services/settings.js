import { supabase } from "../lib/supabase.js";

export async function fetchSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("costo_delivery, whatsapp_num, max_cambios, max_por_horario, alerta_pedidos")
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

  return {
    costoDelivery: data.costo_delivery,
    whatsappNum: data.whatsapp_num,
    maxCambios: data.max_cambios,
    maxPorHorario: data.max_por_horario,
    alertaPedidos: data.alerta_pedidos,
    timeSlots: slots.map((s) => s.slot),
    blockedWeekdays: blocked.map((b) => b.dow),
  };
}
