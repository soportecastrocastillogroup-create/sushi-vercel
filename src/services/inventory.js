import { supabase } from "../lib/supabase.js";

// Inventario de insumos (PRD 02 · Etapa 3). El stock se calcula en la base
// (inventory_daily e inventory_stock); aquí solo se leen y escriben
// movimientos y configuración. La autoría la completa un trigger.

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const TIPOS = {
  ingreso: { label: "Ingreso", signo: 1 },
  uso: { label: "Uso", signo: -1 },
  merma: { label: "Merma", signo: -1 },
  ajuste: { label: "Ajuste", signo: 0 },
};

export async function fetchInventoryConfig() {
  const [items, itemBranches, branches] = await Promise.all([
    supabase.from("inventory_items").select("*").order("sort_order").order("nombre"),
    supabase.from("inventory_item_branches").select("*"),
    supabase.from("branches").select("id, name").eq("active", true).order("sort_order"),
  ]);
  return { items: must(items), itemBranches: must(itemBranches), branches: must(branches) };
}

export const fetchDaily = async (branchId, fecha) =>
  must(await supabase.rpc("inventory_daily", { p_branch_id: branchId, p_fecha: fecha }));

// Insumos críticos en rojo, de todas las sucursales (badge del menú y alertas).
export const fetchCriticalAlerts = async () =>
  must(await supabase.from("inventory_stock").select("*").eq("critico", true).eq("semaforo", "rojo").order("sort_order"));

export async function fetchMovements({ branchId, itemId, tipo, desde, hasta, persona } = {}) {
  let q = supabase
    .from("inventory_movements")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (branchId) q = q.eq("branch_id", branchId);
  if (itemId) q = q.eq("item_id", itemId);
  if (tipo) q = q.eq("tipo", tipo);
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  if (persona) q = q.eq("created_by_nombre", persona);
  return must(await q);
}

// La cantidad se ingresa en positivo; el signo lo pone el tipo. En un ajuste
// la cantidad ya viene con signo (stock contado − stock del sistema).
export const cantidadConSigno = (tipo, cantidad) =>
  tipo === "ajuste" ? Number(cantidad) : TIPOS[tipo].signo * Math.abs(Number(cantidad));

export async function saveMovement(m) {
  const row = {
    item_id: m.item_id,
    branch_id: m.branch_id,
    tipo: m.tipo,
    cantidad: cantidadConSigno(m.tipo, m.cantidad),
    fecha: m.fecha,
    observacion: m.observacion?.trim() || "",
  };
  return m.id
    ? must(await supabase.from("inventory_movements").update(row).eq("id", m.id))
    : must(await supabase.from("inventory_movements").insert(row));
}

export const deleteMovement = async (id) => must(await supabase.from("inventory_movements").delete().eq("id", id));

// ── Configuración (solo administrador; lo garantiza RLS) ────────────────────
export async function saveItem(item, branchRows) {
  const row = {
    nombre: item.nombre.trim(),
    unidad: item.unidad.trim(),
    critico: item.critico,
    active: item.active,
    sort_order: Number(item.sort_order) || 0,
  };
  const saved = item.id
    ? must(await supabase.from("inventory_items").update(row).eq("id", item.id).select().single())
    : must(await supabase.from("inventory_items").insert(row).select().single());

  must(await supabase.from("inventory_item_branches").delete().eq("item_id", saved.id));
  const usadas = branchRows.filter((b) => b.usa);
  if (usadas.length) {
    must(
      await supabase.from("inventory_item_branches").insert(
        usadas.map((b) => ({ item_id: saved.id, branch_id: b.branch_id, stock_minimo: Math.max(0, Number(b.stock_minimo) || 0) }))
      )
    );
  }
  return saved;
}

export async function deleteItem(id) {
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error?.code === "23503") throw new Error("Este insumo tiene movimientos. Desactívalo para conservar su historial.");
  if (error) throw new Error(error.message);
}
