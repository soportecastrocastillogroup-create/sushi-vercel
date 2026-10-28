// Pruebas de la lógica de cupos por bloque (utils/dates.js).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bloqueDe,
  bloquesDe,
  cupoDe,
  getHorariosDisponibles,
  hhmm,
  isoLocal,
  minutosDe,
  pedidosEnBloque,
  proponerHorarios,
  rangoBloque,
  sumarDias,
} from "../../src/utils/dates.js";

const SLOTS = ["17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15"];
const FECHA = "2031-03-14";
// "Ahora" en otro día, para que no se descarten franjas por cercanía.
const AHORA = new Date("2031-03-01T15:00:00Z");

const pedido = (horario, sucursal = "La Paz", extra = {}) => ({ fecha: FECHA, horario, sucursal, estado: "abierto", ...extra });
const base = (extra = {}) => ({ fecha: FECHA, timeSlots: SLOTS, sucursal: "La Paz", ahora: AHORA, ...extra });

test("bloqueDe agrupa por bloques de 30 o 60 minutos", () => {
  assert.equal(bloqueDe("17:45"), "17:30");
  assert.equal(bloqueDe("17:29"), "17:00");
  assert.equal(bloqueDe("9:15"), "09:00");
  assert.equal(bloqueDe("17:45", 60), "17:00");
  assert.deepEqual(bloquesDe(SLOTS), ["17:00", "17:30", "18:00", "18:30", "19:00"]);
  assert.deepEqual(bloquesDe(SLOTS, 60), ["17:00", "18:00", "19:00"]);
  assert.equal(minutosDe("18:35"), 1115);
  assert.equal(hhmm(1115), "18:35");
});

test("pedidosEnBloque cuenta el bloque de esa sucursal, incluidos los completados y las horas reales", () => {
  const orders = [
    pedido("18:00"),
    pedido("18:25", "La Paz", { estado: "completado" }),
    pedido("18:30"),
    pedido("18:15", "Loncoche"),
    { ...pedido("18:10"), fecha: "2031-03-15" },
  ];
  assert.equal(pedidosEnBloque(FECHA, orders, "18:15", "La Paz"), 2);
  assert.equal(pedidosEnBloque(FECHA, orders, "18:45", "La Paz"), 1);
  assert.equal(pedidosEnBloque(FECHA, orders, "18:45", "La Paz", 60), 3);
  assert.equal(pedidosEnBloque(FECHA, orders, "18:00", "Loncoche"), 1);
});

test("un bloque lleno saca sus franjas, sin afectar a la otra sucursal", () => {
  const orders = [pedido("18:00"), pedido("18:20")];
  assert.deepEqual(getHorariosDisponibles(base({ orders, cupo: 2 })), ["17:00", "17:15", "17:30", "17:45", "18:30", "18:45", "19:00", "19:15"]);
  assert.deepEqual(getHorariosDisponibles(base({ orders, cupo: 2, sucursal: "Loncoche" })), SLOTS);
  // Con bloques de una hora, el bloque de las 18 sigue lleno.
  assert.deepEqual(getHorariosDisponibles(base({ orders, cupo: 2, bloqueMinutos: 60 })), ["17:00", "17:15", "17:30", "17:45", "19:00", "19:15"]);
});

test("hoy se descartan las franjas antes del tiempo de preparación; la primera queda preseleccionada", () => {
  const ahora = new Date(`${FECHA}T18:10:00`);
  assert.deepEqual(getHorariosDisponibles(base({ orders: [], cupo: 4, ahora })), ["18:30", "18:45", "19:00", "19:15"]);
  assert.deepEqual(getHorariosDisponibles(base({ orders: [], cupo: 4, ahora, preparacion: 40 })), ["19:00", "19:15"]);
});

test("proponerHorarios sugiere las siguientes franjas con cupo del mismo día", () => {
  const orders = [pedido("18:00"), pedido("18:15")];
  assert.deepEqual(proponerHorarios(base({ orders, cupo: 2, desde: "18:15" })), ["18:30", "18:45", "19:00"]);
  assert.deepEqual(proponerHorarios(base({ orders, cupo: 2, desde: "17:15", cantidad: 2 })), ["17:30", "17:45"]);
  assert.deepEqual(proponerHorarios(base({ orders, cupo: 2, desde: "19:15" })), []);
});

test("cupoDe usa el cupo por bloque de la sucursal y 2 por defecto", () => {
  const settings = { cupoPorBloque: { "La Paz": 6, Loncoche: 3 } };
  assert.equal(cupoDe(settings, "La Paz"), 6);
  assert.equal(cupoDe(settings, "Loncoche"), 3);
  assert.equal(cupoDe(settings, "Otra"), 2);
  assert.equal(cupoDe(null, "La Paz"), 2);
});

test("isoLocal usa la fecha local, no UTC (21:30 en Chile sigue siendo hoy)", () => {
  assert.equal(isoLocal(new Date(2031, 2, 14, 21, 30)), "2031-03-14");
  assert.equal(isoLocal(new Date(2031, 2, 14, 23, 59)), "2031-03-14");
  assert.equal(isoLocal(new Date(2031, 0, 5, 0, 1)), "2031-01-05");
});

test("sumarDias cruza meses y años", () => {
  assert.equal(sumarDias("2031-01-31", 1), "2031-02-01");
  assert.equal(sumarDias("2031-01-01", -1), "2030-12-31");
});

test("rangoBloque muestra el bloque completo y el último termina al cierre", () => {
  assert.equal(rangoBloque("10:15"), "10:00 – 10:30");
  assert.equal(rangoBloque("10:45", 60), "10:00 – 11:00");
  const franjas = ["21:00", "21:15", "21:30", "21:45", "22:00"];
  assert.equal(rangoBloque("21:30", 30, franjas), "21:30 – 22:00");
  assert.equal(rangoBloque("22:00", 30, franjas), "22:00");
  assert.equal(rangoBloque("21:00", 60, franjas), "21:00 – 22:00");
});
