export const ESTADOS = {
  abierto: {
    label: "Abierto",
    color: "#F59E0B",
    bg: "#3A2000",
    next: "en_proceso",
    prev: null,
  },
  en_proceso: {
    label: "En proceso",
    color: "#60A5FA",
    bg: "#0D2444",
    next: "listo",
    prev: "abierto",
  },
  listo: {
    label: "Listo ✓",
    color: "#34D399",
    bg: "#063828",
    next: "completado",
    prev: "en_proceso",
  },
  completado: {
    label: "Completado",
    color: "#6B7280",
    bg: "#1A1F1A",
    next: null,
    prev: "listo",
  },
};

export const FUENTES = [
  { id: "web", label: "🌐 Web" },
  { id: "whatsapp", label: "💬 WhatsApp" },
  { id: "instagram", label: "📷 Instagram" },
  { id: "presencial", label: "🏪 Presencial" },
  { id: "llamada", label: "📞 Llamada" },
];

export const getPagos = (tipo) =>
  tipo === "delivery"
    ? [{ id: "transferencia", label: "Transferencia bancaria" }]
    : [
        { id: "transferencia", label: "Transferencia bancaria" },
        {
          id: "pago_contra_entrega",
          label: "Pago al retirar — tarjeta (crédito/débito) o efectivo",
        },
      ];

export const NOMBRES_DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
