// Pruebas de la lógica de cupos por hora (utils/dates.js).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bloquesCliente,
  bloquesDe,
  cupoDe,
  getHorariosDisponibles,
  horaDe,
  isoLocal,
  pedidosEnHora,
  proponerHorarios,
  rangoBloque,
  sumarDias,
  textoBloque,
} from "../../src/utils/dates.js";

const SLOTS = ["17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15"];
const FECHA = "2031-03-14";
// "Ahora" en otro día, para que no se descarten franjas por cercanía.
const AHORA = new Date("2031-03-01T15:00:00Z");

const pedido = (horario, sucursal = "La Paz", extra = {}) => ({ fecha: FECHA, horario, sucursal, estado: "abierto", ...extra });

test("horaDe agrupa las franjas por hora", () => {
  assert.equal(horaDe("17:45"), "17");
  assert.equal(horaDe("9:15"), "09");
  assert.deepEqual(bloquesDe(SLOTS), ["17", "18", "19"]);
});

test("pedidosEnHora cuenta el bloque completo de esa sucursal, incluidos los completados", () => {
  const orders = [
    pedido("18:00"),
    pedido("18:45", "La Paz", { estado: "completado" }),
    pedido("18:15", "Loncoche"),
    pedido("19:00"),
    { ...pedido("18:30"), fecha: "2031-03-15" },
  ];
  assert.equal(pedidosEnHora(FECHA, orders, "18:30", "La Paz"), 2);
  assert.equal(pedidosEnHora(FECHA, orders, "18:00", "Loncoche"), 1);
  assert.equal(pedidosEnHora(FECHA, orders, "17:00", "La Paz"), 0);
});

test("un bloque lleno saca todas sus franjas, sin afectar a la otra sucursal", () => {
  const orders = [pedido("18:00"), pedido("18:30")];
  const laPaz = getHorariosDisponibles(FECHA, orders, SLOTS, 2, "La Paz", AHORA);
  assert.deepEqual(laPaz, ["17:00", "17:15", "17:30", "17:45", "19:00", "19:15"]);
  const loncoche = getHorariosDisponibles(FECHA, orders, SLOTS, 2, "Loncoche", AHORA);
  assert.deepEqual(loncoche, SLOTS);
});

test("hoy se descartan las franjas a menos de 30 minutos", () => {
  // 18:10 local del mismo día de FECHA.
  const ahora = new Date(`${FECHA}T18:10:00`);
  const disp = getHorariosDisponibles(FECHA, [], SLOTS, 4, "La Paz", ahora);
  assert.deepEqual(disp, ["18:45", "19:00", "19:15"]);
});

test("proponerHorarios sugiere las siguientes franjas con cupo del mismo día", () => {
  const orders = [pedido("18:00"), pedido("18:15")];
  assert.deepEqual(proponerHorarios(FECHA, orders, SLOTS, 2, "La Paz", "18:15", 3, AHORA), ["19:00", "19:15"]);
  assert.deepEqual(proponerHorarios(FECHA, orders, SLOTS, 2, "La Paz", "17:15", 2, AHORA), ["17:30", "17:45"]);
  assert.deepEqual(proponerHorarios(FECHA, orders, SLOTS, 2, "La Paz", "19:15", 3, AHORA), []);
});

test("cupoDe usa el cupo de la sucursal y 4 por defecto", () => {
  const settings = { cupoPorHora: { "La Paz": 6, Loncoche: 3 } };
  assert.equal(cupoDe(settings, "La Paz"), 6);
  assert.equal(cupoDe(settings, "Loncoche"), 3);
  assert.equal(cupoDe(settings, "Otra"), 4);
  assert.equal(cupoDe(undefined, "La Paz"), 4);
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

// ── Bloques de una hora para el cliente ──────────────────────────────────────
const BASE = ["17:00", "17:15", "17:30", "17:45", "21:00", "21:15", "21:30", "21:45", "22:00"];

test("rangoBloque: hora completa y último bloque corto", () => {
  assert.equal(rangoBloque("17:00", BASE), "17:00 – 18:00");
  assert.equal(rangoBloque("21:30", BASE), "21:00 – 22:00");
  assert.equal(rangoBloque("22:00", BASE), "22:00");
  assert.equal(rangoBloque("22:00", [...BASE, "22:15", "22:30"]), "22:00 – 22:30");
  assert.equal(rangoBloque("20:15"), "20:00 – 21:00");
});

test("textoBloque: dentro de una frase", () => {
  assert.equal(textoBloque("21:00", BASE), "entre 21:00 y 22:00");
  assert.equal(textoBloque("22:00", BASE), "a las 22:00");
});

test("bloquesCliente: uno por hora, con la primera franja y el cupo del bloque", () => {
  const slots = BASE.map((slot) => ({ slot, disponible: !slot.startsWith("21") }));
  const b = bloquesCliente(FECHA, slots, AHORA);
  assert.deepEqual(
    b.map((x) => [x.slot, x.label, x.disponible]),
    [
      ["17:00", "17:00 – 18:00", true],
      ["21:00", "21:00 – 22:00", false],
      ["22:00", "22:00", true],
    ]
  );
});

test("bloquesCliente: oculta los bloques que empiezan en menos de 30 minutos", () => {
  const slots = BASE.map((slot) => ({ slot, disponible: true }));
  const ahora = new Date(2031, 2, 14, 20, 40); // 20:40 hora local de FECHA
  assert.deepEqual(
    bloquesCliente(FECHA, slots, ahora).map((x) => x.slot),
    ["22:00"]
  );
  const temprano = new Date(2031, 2, 14, 20, 20);
  assert.deepEqual(
    bloquesCliente(FECHA, slots, temprano).map((x) => x.slot),
    ["21:00", "22:00"]
  );
});
