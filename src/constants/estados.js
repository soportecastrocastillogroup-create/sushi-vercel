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
  { id: "cuenta_web", label: "🧑 Cuenta web" },
  { id: "whatsapp", label: "💬 WhatsApp" },
  { id: "instagram", label: "📷 Instagram" },
  { id: "presencial", label: "🏪 Presencial" },
  { id: "llamada", label: "📞 Llamada" },
];

// Medios de pago (reunión del 26 oct 2026): los tres en retiro y delivery.
// "pago_contra_entrega" queda solo para mostrar pedidos anteriores.
export const PAGOS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "debito", label: "Débito" },
  { id: "transferencia", label: "Transferencia bancaria" },
];
const PAGOS_ANTERIORES = [{ id: "pago_contra_entrega", label: "Pago al retirar (tarjeta o efectivo)" }];

export const getPagos = () => PAGOS;

export const pagoLabel = (id) => [...PAGOS, ...PAGOS_ANTERIORES].find((p) => p.id === id)?.label ?? id;

export const NOMBRES_DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
