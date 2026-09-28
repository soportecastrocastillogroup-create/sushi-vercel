import { supabase } from "../lib/supabase.js";
import { compressImage } from "../utils/image.js";

// Escritura del catálogo y del sitio desde el panel (solo administradores; lo
// garantizan las políticas RLS de la migración site_cms).

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// ── Imágenes ─────────────────────────────────────────────────────────────────
export async function uploadImage(bucket, file, maxSize) {
  const blob = await compressImage(file, { maxSize });
  const path = `${crypto.randomUUID()}.webp`;
  must(await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" }));
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function removeImage(bucket, url) {
  const marker = `/object/public/${bucket}/`;
  if (!url?.includes(marker)) return;
  await supabase.storage.from(bucket).remove([url.split(marker)[1]]);
}

// ── Catálogo ─────────────────────────────────────────────────────────────────
export async function fetchCatalogAdmin() {
  const [cats, prods, branches, custom] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("products")
      .select("*, product_branches(branch_id), promo_rolls(envoltura, relleno, sort_order), promo_options(label, roll_idx, choices)")
      .order("sort_order"),
    supabase.from("branches").select("id, name").order("sort_order"),
    supabase.from("customization_options").select("*").order("sort_order"),
  ]);
  return {
    categories: must(cats),
    products: must(prods).map((p) => ({
      ...p,
      branchIds: p.product_branches.map((b) => b.branch_id),
      rolls: [...p.promo_rolls].sort((a, b) => a.sort_order - b.sort_order),
      options: p.promo_options,
    })),
    branches: must(branches),
    customizations: must(custom),
  };
}

export async function saveProduct(p) {
  const row = {
    category_id: p.category_id,
    nombre: p.nombre.trim(),
    precio: p.precio,
    piezas: p.piezas || null,
    desc_text: p.desc_text?.trim() || null,
    envoltura_actual: p.envoltura_actual || null,
    active: p.active,
    sort_order: p.sort_order ?? 0,
    image_url: p.image_url || null,
  };
  const saved = p.id
    ? must(await supabase.from("products").update(row).eq("id", p.id).select("id").single())
    : must(await supabase.from("products").insert(row).select("id").single());
  const id = saved.id;

  // Sucursales, rolls y opciones se reemplazan completos.
  must(await supabase.from("product_branches").delete().eq("product_id", id));
  if (p.branchIds.length) {
    must(await supabase.from("product_branches").insert(p.branchIds.map((branch_id) => ({ product_id: id, branch_id }))));
  }
  must(await supabase.from("promo_rolls").delete().eq("product_id", id));
  const rolls = p.rolls.filter((r) => r.envoltura.trim() && r.relleno.trim());
  if (rolls.length) {
    must(
      await supabase
        .from("promo_rolls")
        .insert(rolls.map((r, i) => ({ product_id: id, sort_order: i, envoltura: r.envoltura.trim(), relleno: r.relleno.trim() })))
    );
  }
  must(await supabase.from("promo_options").delete().eq("product_id", id));
  const options = p.options.filter((o) => o.label.trim() && o.choices.every((c) => c.trim()));
  if (options.length) {
    must(
      await supabase.from("promo_options").insert(
        options.map((o) => ({ product_id: id, label: o.label.trim(), roll_idx: o.roll_idx, choices: o.choices.map((c) => c.trim()) }))
      )
    );
  }
  if (!p.id) must(await supabase.from("product_stock").upsert({ product_id: id, available: true }));
  return id;
}

export const setProductActive = async (id, active) =>
  must(await supabase.from("products").update({ active }).eq("id", id));

export const deleteProduct = async (id) => must(await supabase.from("products").delete().eq("id", id));

export async function saveCategory(c) {
  const row = { name: c.name.trim(), sort_order: c.sort_order, active: c.active };
  return c.id
    ? must(await supabase.from("categories").update(row).eq("id", c.id))
    : must(await supabase.from("categories").insert(row));
}

export const deleteCategory = async (id) => must(await supabase.from("categories").delete().eq("id", id));

export async function saveCustomization(c) {
  const row = { nombre: c.nombre.trim(), precio: c.precio, tipo: c.tipo, sort_order: c.sort_order ?? 0 };
  return c.id
    ? must(await supabase.from("customization_options").update(row).eq("id", c.id))
    : must(await supabase.from("customization_options").insert({ ...row, id: crypto.randomUUID() }));
}

export const deleteCustomization = async (id) =>
  must(await supabase.from("customization_options").delete().eq("id", id));

// ── Sitio ────────────────────────────────────────────────────────────────────
export async function fetchSiteAdmin() {
  const [content, slides, branches, settings, slots, blocked] = await Promise.all([
    supabase.from("site_content").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_slides").select("*").order("sort_order"),
    supabase.from("branches").select("*").order("sort_order"),
    supabase
      .from("app_settings")
      .select("costo_delivery, whatsapp_num, max_cambios, max_por_horario, alerta_pedidos")
      .eq("id", 1)
      .single(),
    supabase.from("time_slots").select("slot, sort_order").order("sort_order"),
    supabase.from("blocked_weekdays").select("dow"),
  ]);
  return {
    content: must(content) ?? { horario: "", instagram: "" },
    slides: must(slides),
    branches: must(branches),
    settings: must(settings),
    slots: must(slots).map((s) => s.slot),
    blocked: must(blocked).map((b) => b.dow),
  };
}

export async function saveSlide(s) {
  const row = {
    sort_order: s.sort_order,
    active: s.active,
    kicker: s.kicker,
    titulo_1: s.titulo_1,
    titulo_2: s.titulo_2,
    texto: s.texto,
    cta_label: s.cta_label,
    cta_to: s.cta_to,
    image_url: s.image_url || null,
    arte: s.arte,
  };
  return s.id
    ? must(await supabase.from("site_slides").update(row).eq("id", s.id))
    : must(await supabase.from("site_slides").insert(row));
}

export const deleteSlide = async (id) => must(await supabase.from("site_slides").delete().eq("id", id));

export async function saveBranchInfo(b) {
  const servicios = b.serviciosText
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return must(
    await supabase
      .from("branches")
      .update({ direccion: b.direccion || null, referencia: b.referencia || null, mapa: b.mapa || null, servicios })
      .eq("id", b.id)
  );
}

export async function saveBusiness({ content, settings, slots, blocked }) {
  must(
    await supabase
      .from("site_content")
      .upsert({ id: 1, horario: content.horario, instagram: content.instagram, updated_at: new Date().toISOString() })
  );
  must(await supabase.from("app_settings").update(settings).eq("id", 1));
  must(await supabase.from("time_slots").delete().neq("slot", ""));
  if (slots.length) must(await supabase.from("time_slots").insert(slots.map((slot, i) => ({ slot, sort_order: i + 1 }))));
  must(await supabase.from("blocked_weekdays").delete().gte("dow", 0));
  if (blocked.length) must(await supabase.from("blocked_weekdays").insert(blocked.map((dow) => ({ dow }))));
}
