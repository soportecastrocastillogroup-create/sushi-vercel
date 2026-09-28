import { useEffect, useState } from "react";
import { fetchSite } from "../services/site.js";
import { HERO_SLIDES, LOCALES, SITE } from "../content/site.js";

// Contenido de la landing desde Supabase. Si falla o está vacío, usa el
// contenido de respaldo de src/content/site.js para que la página nunca quede
// en blanco.
const FALLBACK = {
  horario: SITE.horario,
  instagram: SITE.instagram,
  slides: HERO_SLIDES,
  locales: LOCALES,
};

export function usePublicSite() {
  const [site, setSite] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetchSite()
      .then((d) => {
        if (cancelled) return;
        setSite({
          horario: d.content?.horario || FALLBACK.horario,
          instagram: d.content?.instagram || FALLBACK.instagram,
          slides: d.slides.length ? d.slides : FALLBACK.slides,
          locales: d.locales.length ? d.locales : FALLBACK.locales,
        });
      })
      .catch(() => {
        // Se mantiene el respaldo.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return site;
}
