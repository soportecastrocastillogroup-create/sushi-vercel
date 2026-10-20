// Pruebas de la fórmula de cuadratura (utils/caja.js).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCuadratura } from "../../src/utils/caja.js";

const sistema = {
  ventas_por_metodo: { pago_contra_entrega: 30000, transferencia: 25000 },
  total_repartidor: 4000,
};

test("cuadra cuando el efectivo y las transferencias coinciden", () => {
  // Efectivo esperado: 20.000 + (30.000 − 10.000 en tarjetas) − (4.000 + 1.500) = 34.500.
  const r = calcularCuadratura(sistema, {
    fondo_inicial: 20000,
    efectivo_contado: 34500,
    tarjetas: 10000,
    transferencias: 25000,
    otros_egresos: [{ detalle: "Hielo", monto: 1500 }],
  });
  assert.equal(r.ventasEfectivo, 20000);
  assert.equal(r.egresosEfectivo, 5500);
  assert.equal(r.esperado, 34500);
  assert.deepEqual([r.difEfectivo, r.difTransferencias, r.difTotal], [0, 0, 0]);
});

test("informa faltantes y sobrantes con signo", () => {
  const r = calcularCuadratura(sistema, {
    fondo_inicial: 20000,
    efectivo_contado: 33500,
    tarjetas: 10000,
    transferencias: 26000,
    otros_egresos: [{ detalle: "Hielo", monto: 1500 }],
  });
  assert.equal(r.difEfectivo, -1000);
  assert.equal(r.difTransferencias, 1000);
  assert.equal(r.difTotal, 0);
});

test("acepta campos vacíos y egresos sin monto", () => {
  const r = calcularCuadratura({ ventas_por_metodo: {}, total_repartidor: 0 }, {
    fondo_inicial: "",
    efectivo_contado: "",
    tarjetas: "",
    transferencias: "",
    otros_egresos: [{ detalle: "", monto: "" }],
  });
  assert.deepEqual([r.esperado, r.difTotal], [0, 0]);
});
