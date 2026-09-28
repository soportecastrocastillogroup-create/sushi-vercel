import { supabase } from "../lib/supabase.js";

// Contenido público de la landing y de Locales (PRD 01, Etapa D).
export async function fetchSite() {
  const [content, slides, branches] = await Promise.all([
    supabase.from("site_content").select("horario, instagram").eq("id", 1).maybeSingle(),
    supabase.from("site_slides").select("*").eq("active", true).order("sort_order"),
    supabase
      .from("branches")
      .select("id, name, direccion, referencia, mapa, servicios")
      .eq("active", true)
      .order("sort_order"),
  ]);
  const err = content.error || slides.error || branches.error;
  if (err) throw err;

  return {
    content: content.data,
    slides: slides.data.map((s) => ({
      id: s.id,
      kicker: s.kicker,
      titulo: [s.titulo_1, s.titulo_2],
      texto: s.texto,
      cta: { label: s.cta_label, to: s.cta_to },
      arte: s.arte,
      imageUrl: s.image_url,
    })),
    locales: branches.data.map((b) => ({
      name: b.name,
      direccion: b.direccion,
      referencia: b.referencia,
      mapa: b.mapa,
      servicios: b.servicios ?? [],
    })),
  };
}
