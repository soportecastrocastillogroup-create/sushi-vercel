// Pruebas de la fórmula de cuadratura (utils/caja.js).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCuadratura } from "../../src/utils/caja.js";

const sistema = {
  ventas_por_metodo: { efectivo: 30000, debito: 12000, transferencia: 25000 },
  total_repartidor: 4000,
};

test("cuadra cuando efectivo, débito y transferencias coinciden", () => {
  // Efectivo esperado: 20.000 + 30.000 − (4.000 + 1.500) = 44.500.
  const r = calcularCuadratura(sistema, {
    fondo_inicial: 20000,
    efectivo_contado: 44500,
    tarjetas: 12000,
    transferencias: 25000,
    otros_egresos: [{ detalle: "Hielo", monto: 1500 }],
  });
  assert.equal(r.ventasEfectivo, 30000);
  assert.equal(r.ventasDebito, 12000);
  assert.equal(r.egresosEfectivo, 5500);
  assert.equal(r.esperado, 44500);
  assert.deepEqual([r.difEfectivo, r.difTransferencias, r.difTarjetas, r.difTotal], [0, 0, 0, 0]);
});

test("informa faltantes y sobrantes con signo", () => {
  const r = calcularCuadratura(sistema, {
    fondo_inicial: 20000,
    efectivo_contado: 43500,
    tarjetas: 11000,
    transferencias: 26000,
    otros_egresos: [{ detalle: "Hielo", monto: 1500 }],
  });
  assert.equal(r.difEfectivo, -1000);
  assert.equal(r.difTransferencias, 1000);
  assert.equal(r.difTarjetas, -1000);
  assert.equal(r.difTotal, -1000);
});

test("un pedido anterior con pago al retirar pagado con tarjeta se compensa", () => {
  // 10.000 en "pago al retirar" se cuentan como efectivo, pero se pagaron con
  // débito: falta en efectivo y sobra en tarjetas; el total cuadra.
  const r = calcularCuadratura(
    { ventas_por_metodo: { pago_contra_entrega: 10000 }, total_repartidor: 0 },
    { fondo_inicial: 0, efectivo_contado: 0, tarjetas: 10000, transferencias: 0, otros_egresos: [] }
  );
  assert.deepEqual([r.difEfectivo, r.difTarjetas, r.difTotal], [-10000, 10000, 0]);
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

test("el pago al repartidor anotado a mano reemplaza al calculado", () => {
  const base = { fondo_inicial: 20000, efectivo_contado: 0, tarjetas: 12000, transferencias: 25000, otros_egresos: [] };
  assert.equal(calcularCuadratura(sistema, base).repartidor, 4000);
  assert.equal(calcularCuadratura(sistema, { ...base, pago_repartidor: "" }).repartidor, 4000);
  const r = calcularCuadratura(sistema, { ...base, pago_repartidor: 6000 });
  assert.equal(r.repartidor, 6000);
  assert.equal(r.esperado, 20000 + 30000 - 6000);
});
