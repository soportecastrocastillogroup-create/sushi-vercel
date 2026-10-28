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

// El cupo es por bloque y por sucursal. Los bloques duran
// settings.bloqueMinutos (30 o 60, lo configura el administrador): con 30,
// "19:00" y "19:15" comparten el bloque 19:00, y "19:30" ya es el siguiente.
// Cuentan todos los pedidos del bloque, también los completados (la misma
// regla que aplica create_order en la base con bloque_inicio()).
export const minutosDe = (horario) => {
  const [hh, mm] = String(horario).split(":").map(Number);
  return hh * 60 + (mm || 0);
};

export const hhmm = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

export const bloqueDe = (horario, bloqueMinutos = 30) =>
  hhmm(Math.floor(minutosDe(horario) / bloqueMinutos) * bloqueMinutos);

export const cupoDe = (settings, sucursal) => settings?.cupoPorBloque?.[sucursal] ?? 2;

export const pedidosEnBloque = (fecha, orders, horario, sucursal, bloqueMinutos = 30) =>
  orders.filter(
    (o) =>
      o.fecha === fecha &&
      o.sucursal === sucursal &&
      bloqueDe(o.horario, bloqueMinutos) === bloqueDe(horario, bloqueMinutos)
  ).length;

// Texto del bloque: "10:00 – 10:30" (o "10:00 – 11:00" con bloques de una
// hora). Con las franjas, el último termina al cierre, como en
// available_blocks: si empieza al cierre, queda solo "22:00".
export const rangoBloque = (horario, bloqueMinutos = 30, timeSlots = []) => {
  const inicio = minutosDe(bloqueDe(horario, bloqueMinutos));
  const cierre = timeSlots.length ? Math.max(...timeSlots.map(minutosDe)) : Infinity;
  const fin = Math.max(inicio, Math.min(inicio + bloqueMinutos, cierre));
  return fin === inicio ? hhmm(inicio) : `${hhmm(inicio)} – ${hhmm(fin)}`;
};

// Inicios de bloque a partir de las franjas: ["17:00", "17:15", "17:30"] → ["17:00", "17:30"].
export const bloquesDe = (timeSlots, bloqueMinutos = 30) =>
  [...new Set(timeSlots.map((h) => bloqueDe(h, bloqueMinutos)))].sort();

// Hoy no se ofrecen franjas antes de que el pedido pueda estar listo
// (ahora + minutos de preparación).
export const franjaCercana = (fecha, h, ahora = new Date(), preparacion = 20) => {
  if (fecha !== isoLocal(ahora)) return false;
  const [hh, mm] = h.split(":").map(Number);
  const limite = new Date(ahora);
  limite.setHours(hh, mm, 0, 0);
  return (limite - ahora) / 60000 < preparacion;
};

// Franjas con cupo; la primera es la que se preselecciona.
export const getHorariosDisponibles = ({
  fecha,
  orders,
  timeSlots,
  cupo = 2,
  sucursal,
  bloqueMinutos = 30,
  preparacion = 20,
  ahora = new Date(),
}) =>
  timeSlots.filter(
    (h) =>
      !franjaCercana(fecha, h, ahora, preparacion) &&
      pedidosEnBloque(fecha, orders, h, sucursal, bloqueMinutos) < cupo
  );

// Propuesta cuando un bloque está lleno: las siguientes franjas con cupo del
// mismo día, después de la elegida.
export const proponerHorarios = ({ desde, cantidad = 3, ...opciones }) =>
  getHorariosDisponibles(opciones)
    .filter((h) => h > desde)
    .slice(0, cantidad);
