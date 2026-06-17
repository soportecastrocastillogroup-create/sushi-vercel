import { supabase } from "../lib/supabase.js";

export async function fetchBranches() {
  const { data, error } = await supabase
    .from("branches")
    .select("name")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data.map((b) => b.name);
}

export async function fetchMenu() {
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(
      `
      id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order,
      categories ( name ),
      product_branches ( branches ( name ) ),
      promo_rolls ( sort_order, envoltura, relleno ),
      promo_options ( label, roll_idx, choices )
    `
    )
    .eq("active", true)
    .order("sort_order");
  if (pErr) throw pErr;

  return products.map((p) => {
    const item = {
      id: p.id,
      cat: p.categories?.name || "",
      nombre: p.nombre,
      precio: p.precio,
      piezas: p.piezas,
      sucursales: (p.product_branches || [])
        .map((pb) => pb.branches?.name)
        .filter(Boolean),
    };
    if (p.desc_text) item.desc = p.desc_text;
    if (p.envoltura_actual) item.envolturaActual = p.envoltura_actual;
    if (p.promo_rolls?.length) {
      item.rolls = [...p.promo_rolls]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({ envoltura: r.envoltura, relleno: r.relleno }));
    }
    if (p.promo_options?.length) {
      item.opciones = p.promo_options.map((o) => ({
        label: o.label,
        rollIdx: o.roll_idx,
        choices: o.choices,
      }));
    }
    return item;
  });
}

export async function fetchCustomizations() {
  const { data, error } = await supabase
    .from("customization_options")
    .select("id, tipo, nombre, precio")
    .order("sort_order");
  if (error) throw error;

  const rellenos = data.filter((c) => c.tipo === "relleno");
  const envolturas = data.filter((c) => c.tipo === "envoltura");
  const salsas = data.filter((c) => c.tipo === "salsa");
  const soloPollo = data.find((c) => c.id === "solo_pollo") || {
    id: "solo_pollo",
    nombre: "Toda la promo solo pollo",
    precio: 500,
    tipo: "especial",
  };

  return { rellenos, envolturas, salsas, soloPollo };
}
