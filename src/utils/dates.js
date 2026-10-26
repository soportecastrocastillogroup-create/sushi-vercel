import { NOMBRES_DIAS } from "../constants/estados.js";

// Fecha "YYYY-MM-DD" en la hora local del equipo. No usar toISOString(): está
// en UTC y, desde las 21:00 en Chile, ya devuelve el día siguiente.
export const isoLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const sumarDias = (iso, dias) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
};

export const formatFecha = (iso) => {
  const d = new Date(iso + "T12:00:00");
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const hoy = isoLocal();
  const manana = sumarDias(hoy, 1);
  if (iso === hoy) return `Hoy, ${d.getDate()} ${meses[d.getMonth()]}`;
  if (iso === manana) return `Mañana, ${d.getDate()} ${meses[d.getMonth()]}`;
  return `${NOMBRES_DIAS[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
};

export const getFechasDisponibles = (
  diasDesbloqueados = [],
  blockedWeekdays = [0, 1, 2]
) => {
  const resultado = [];
  const hoy = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const iso = isoLocal(d);
    const dow = d.getDay();
    const bloqueado =
      blockedWeekdays.includes(dow) && !diasDesbloqueados.includes(iso);
    resultado.push({ iso, dow, bloqueado });
  }
  return resultado;
};

// El cupo es por hora y por sucursal: "19:00", "19:15", "19:30" y "19:45"
// comparten el bloque de las 19. Cuentan todos los pedidos del bloque,
// también los completados (la misma regla que aplica create_order en la base).
export const horaDe = (horario) => String(horario).split(":")[0].padStart(2, "0");

export const cupoDe = (settings, sucursal) => settings?.cupoPorHora?.[sucursal] ?? 4;

export const pedidosEnHora = (fecha, orders, horario, sucursal) =>
  orders.filter(
    (o) =>
      o.fecha === fecha &&
      o.sucursal === sucursal &&
      horaDe(o.horario) === horaDe(horario)
  ).length;

// Bloques de una hora a partir de las franjas: ["17:00", "17:15", "18:00"] → ["17", "18"].
export const bloquesDe = (timeSlots) => [...new Set(timeSlots.map(horaDe))].sort();

// Hoy no se ofrecen franjas a menos de 30 minutos.
export const franjaCercana = (fecha, h, ahora = new Date()) => {
  if (fecha !== isoLocal(ahora)) return false;
  const [hh, mm] = h.split(":").map(Number);
  const limite = new Date(ahora);
  limite.setHours(hh, mm, 0, 0);
  return (limite - ahora) / 60000 < 30;
};

export const getHorariosDisponibles = (
  fecha,
  orders,
  timeSlots,
  cupoPorHora = 4,
  sucursal,
  ahora = new Date()
) =>
  timeSlots.filter(
    (h) => !franjaCercana(fecha, h, ahora) && pedidosEnHora(fecha, orders, h, sucursal) < cupoPorHora
  );

// Texto del bloque de una hora para el cliente: "20:00 – 21:00". Si el último
// bloque no llega a la hora siguiente, termina en su última franja ("22:00").
export const rangoBloque = (horario, timeSlots = []) => {
  const h = horaDe(horario);
  const inicio = `${h}:00`;
  const siguiente = `${String(Number(h) + 1).padStart(2, "0")}:00`;
  if (!timeSlots.length || timeSlots.some((s) => s >= siguiente)) return `${inicio} – ${siguiente}`;
  const ultima = timeSlots.filter((s) => horaDe(s) === h).sort().at(-1) ?? inicio;
  return ultima === inicio ? inicio : `${inicio} – ${ultima}`;
};

// El mismo bloque dentro de una frase: "entre 20:00 y 21:00" o "a las 22:00".
export const textoBloque = (horario, timeSlots = []) => {
  const [inicio, fin] = rangoBloque(horario, timeSlots).split(" – ");
  return fin ? `entre ${inicio} y ${fin}` : `a las ${inicio}`;
};

// Bloques que ve el cliente a partir de available_slots: uno por hora, con la
// primera franja como horario del pedido. Se ocultan los que empiezan en menos
// de 30 minutos (create_order los rechazaría).
export const bloquesCliente = (fecha, slots, ahora = new Date()) => {
  const timeSlots = slots.map((s) => s.slot);
  const bloques = [];
  for (const s of [...slots].sort((a, b) => a.slot.localeCompare(b.slot))) {
    if (bloques.some((b) => b.hora === horaDe(s.slot))) continue;
    bloques.push({ hora: horaDe(s.slot), slot: s.slot, disponible: s.disponible, label: rangoBloque(s.slot, timeSlots) });
  }
  return bloques.filter((b) => !franjaCercana(fecha, b.slot, ahora));
};

// Propuesta cuando un bloque está lleno: las siguientes franjas con cupo del
// mismo día, después de la elegida.
export const proponerHorarios = (fecha, orders, timeSlots, cupoPorHora, sucursal, desde, cantidad = 3, ahora = new Date()) =>
  getHorariosDisponibles(fecha, orders, timeSlots, cupoPorHora, sucursal, ahora)
    .filter((h) => h > desde)
    .slice(0, cantidad);
