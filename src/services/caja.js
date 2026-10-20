import { supabase } from "../lib/supabase.js";

// Cuadratura de caja (PRD 02 · Etapa 4). Las cifras del sistema y el cierre
// se calculan en la base (cash_summary y save_cash_closing).

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const fetchBranchesCaja = async () =>
  must(await supabase.from("branches").select("id, name, pago_repartidor").eq("active", true).order("sort_order"));

export const fetchCashSummary = async (branchId, fecha) =>
  must(await supabase.rpc("cash_summary", { p_branch_id: branchId, p_fecha: fecha }));

export const fetchClosing = async (branchId, fecha) =>
  must(await supabase.from("cash_closings").select("*").eq("branch_id", branchId).eq("fecha", fecha).maybeSingle());

export const fetchRecentClosings = async (branchId, limit = 10) =>
  must(
    await supabase
      .from("cash_closings")
      .select("fecha, diferencia_total, cerrado_por_nombre, editado_por_nombre")
      .eq("branch_id", branchId)
      .order("fecha", { ascending: false })
      .limit(limit)
  );

export const saveClosing = async (branchId, fecha, declarado) =>
  must(await supabase.rpc("save_cash_closing", { p_branch_id: branchId, p_fecha: fecha, p_declarado: declarado }));
