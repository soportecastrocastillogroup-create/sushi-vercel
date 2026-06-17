import { NOMBRES_DIAS } from "../constants/estados.js";

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
  const hoy = new Date().toISOString().split("T")[0];
  const manana = new Date(Date.now() + 86400000).toISOString().split("T")[0];
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
    const iso = d.toISOString().split("T")[0];
    const dow = d.getDay();
    const bloqueado =
      blockedWeekdays.includes(dow) && !diasDesbloqueados.includes(iso);
    resultado.push({ iso, dow, bloqueado });
  }
  return resultado;
};

export const getHorariosDisponibles = (
  fecha,
  orders,
  timeSlots,
  maxPorHorario = 4
) => {
  const hoy = new Date().toISOString().split("T")[0];
  const ahora = new Date();

  return timeSlots.filter((h) => {
    if (fecha === hoy) {
      const [hh, mm] = h.split(":").map(Number);
      const limiteMs = new Date();
      limiteMs.setHours(hh, mm, 0, 0);
      const diffMin = (limiteMs - ahora) / 60000;
      if (diffMin < 30) return false;
    }
    const count = orders.filter(
      (o) =>
        o.fecha === fecha &&
        o.horario === h &&
        o.estado !== "completado"
    ).length;
    return count < maxPorHorario;
  });
};
