// Contenido de la landing y de Locales.
//
// Etapa A (PRD 01): vive en el código como contenido provisional.
// Etapa D: se mueve a Supabase (`site_slides`, `branches`) para que el
// administrador lo edite desde /panel/sitio. Mantener esta forma de datos
// para que el cambio sea solo de origen.
//
// Datos marcados `porConfirmar` se tomaron del Instagram del negocio y deben
// validarse con el cliente antes de producción.

export const SITE = {
  nombre: "Sushi Loncoche",
  instagram: "https://www.instagram.com/sushi.loncoche/",
  instagramHandle: "@sushi.loncoche",
  horario: "Martes a sábado · 17:00 a 22:00",
  horarioPorConfirmar: true,
};

export const HERO_SLIDES = [
  {
    id: "retiro-delivery",
    kicker: "Loncoche · La Paz",
    titulo: ["Sushi", "Loncoche"],
    texto: "Pide online y retira en el local o recibe en tu casa.",
    cta: { label: "Pedir ahora", to: "/carta" },
    arte: "salmon",
  },
  {
    id: "promos",
    kicker: "Para compartir",
    titulo: ["Promos", "y combos"],
    texto: "Arma tu promo eligiendo los rolls que más te gustan.",
    cta: { label: "Ver la carta", to: "/carta" },
    arte: "avocado",
  },
  {
    id: "sushi-bar",
    kicker: "Sushi Bar Ruta 5",
    titulo: ["A orilla", "de la carretera"],
    texto: "Visítanos en La Paz, con acceso desde la Ruta 5 Sur.",
    cta: { label: "Ver locales", to: "/locales" },
    arte: "tempura",
  },
];

// `name` debe coincidir con `branches.name` en Supabase.
export const LOCALES = [
  {
    name: "Loncoche",
    direccion: null,
    referencia: null,
    mapa: "Loncoche, Araucanía, Chile",
    servicios: ["Retiro en local", "Delivery"],
    porConfirmar: true,
  },
  {
    name: "La Paz",
    direccion: "Arturo Prat 597, La Paz",
    referencia: "Sushi Bar Ruta 5 · Acceso desde Ruta 5 Sur",
    mapa: null,
    servicios: ["Consumo en el local", "Retiro", "Delivery"],
    porConfirmar: true,
  },
];
