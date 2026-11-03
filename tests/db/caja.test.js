// Pruebas de integración de la cuadratura de caja contra Pedidos Desarrollo
// (PRD 02 · Etapa 4): resumen del sistema, cierre, fórmula igual a la del
// frontend, tarifa fija del repartidor, edición y permisos.
//
// Crea pedidos y un cierre en una fecha de 2031 y los borra al terminar.
// Run: npm run test:db
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonClient, login } from "./helpers.js";
import { calcularCuadratura } from "../../src/utils/caja.js";

const FECHA = new Date(Date.UTC(2031, 0, 1) + Math.floor(Math.random() * 360) * 86400000).toISOString().split("T")[0];
const ITEM = { cartId: "c1", productId: "test", nombre: "Producto de prueba", precio: 10000, qty: 1, cambios: [] };

let anon, admin, colab, laPaz, loncoche, tarifaOriginal, nombres;
const ids = [];

const crear = async (tipo, metodoPago, precio, horario) => {
  const { data, error } = await colab.rpc("create_order", {
    p_order: { sucursal: "La Paz", tipo, fecha: FECHA, horario, metodoPago, direccion: "x", cliente: { nombre: "Prueba caja" } },
    p_items: [{ ...ITEM, precio }],
    p_forzar: true,
  });
  if (error) throw error;
  ids.push(data.id);
  return data;
};

before(async () => {
  anon = anonClient();
  admin = await login("administrador");
  colab = await login("colaborador");
  const { data: branches } = await admin.from("branches").select("id, name, pago_repartidor");
  laPaz = branches.find((b) => b.name === "La Paz");
  loncoche = branches.find((b) => b.name === "Loncoche");
  tarifaOriginal = laPaz.pago_repartidor;
  const { data: perfiles } = await admin.from("staff_profiles").select("email, nombre");
  nombres = Object.fromEntries(perfiles.map((p) => [p.email, p.nombre]));
  await admin.from("branches").update({ pago_repartidor: 2500 }).eq("id", laPaz.id);
});

after(async () => {
  if (!admin) return;
  await admin.from("cash_closings").delete().eq("fecha", FECHA);
  await admin.from("orders").delete().eq("fecha", FECHA);
  await admin.from("branches").update({ pago_repartidor: tarifaOriginal }).eq("id", laPaz.id);
  const { data } = await admin.from("cash_closings").select("id").eq("fecha", FECHA);
  assert.equal(data.length, 0, "quedó un cierre de prueba");
});

describe("Etapa 4 · cuadratura de caja", () => {
  let retiro, debito, transf, delivery;

  test("anon no ve el resumen ni los cierres, y nadie los inserta directo", async () => {
    assert.equal((await anon.rpc("cash_summary", { p_branch_id: laPaz.id, p_fecha: FECHA })).error?.code, "42501");
    const { data } = await anon.from("cash_closings").select("*").limit(1);
    assert.equal(data?.length ?? 0, 0);
    const r = await colab.from("cash_closings").insert({ branch_id: laPaz.id, fecha: FECHA });
    assert.equal(r.error?.code, "42501");
  });

  test("el resumen trae pedidos, ventas por método y el pago al repartidor", async () => {
    retiro = await crear("retiro", "efectivo", 10000, "19:00");
    debito = await crear("retiro", "debito", 5000, "19:30");
    transf = await crear("retiro", "transferencia", 8000, "19:15");
    delivery = await crear("delivery", "transferencia", 12000, "20:00");
    const { data: s, error } = await colab.rpc("cash_summary", { p_branch_id: laPaz.id, p_fecha: FECHA });
    assert.ifError(error);
    assert.equal(s.pedidos, 4);
    assert.equal(s.pedidos_pendientes, 4);
    assert.equal(s.ventas_total, retiro.total + debito.total + transf.total + delivery.total);
    assert.deepEqual(s.ventas_por_metodo, { efectivo: retiro.total, debito: debito.total, transferencia: transf.total + delivery.total });
    assert.deepEqual([s.deliveries, s.tarifa_repartidor, s.total_repartidor], [1, 2500, 2500]);

    const { data: otra } = await colab.rpc("cash_summary", { p_branch_id: loncoche.id, p_fecha: FECHA });
    assert.equal(otra.pedidos, 0, "Loncoche no ve los pedidos de La Paz");
  });

  test("el cierre guarda el resultado con la misma fórmula del frontend", async () => {
    const declarado = {
      fondo_inicial: 20000,
      efectivo_contado: 26000,
      tarjetas: 4000,
      transferencias: transf.total + delivery.total - 1000,
      otros_egresos: [{ detalle: " Hielo ", monto: 1500 }, { detalle: "vacío", monto: 0 }],
      observaciones: "Prueba",
    };
    const { data: sys } = await colab.rpc("cash_summary", { p_branch_id: laPaz.id, p_fecha: FECHA });
    const { data: c, error } = await colab.rpc("save_cash_closing", { p_branch_id: laPaz.id, p_fecha: FECHA, p_declarado: declarado });
    assert.ifError(error);
    const js = calcularCuadratura(sys, declarado);
    assert.deepEqual(
      [c.efectivo_esperado, c.diferencia_efectivo, c.diferencia_transferencias, c.diferencia_tarjetas, c.diferencia_total],
      [js.esperado, js.difEfectivo, js.difTransferencias, js.difTarjetas, js.difTotal]
    );
    // 20.000 + 10.000 − (2.500 + 1.500) = 26.000 → efectivo cuadra; faltan 1.000 en transferencias y 1.000 en débito.
    assert.deepEqual([c.efectivo_esperado, c.diferencia_efectivo, c.diferencia_transferencias, c.diferencia_tarjetas], [26000, 0, -1000, -1000]);
    assert.deepEqual(c.otros_egresos, [{ detalle: "Hielo", monto: 1500 }]);
    assert.equal(c.cerrado_por_nombre, nombres["colab.pruebas@example.com"]);
    assert.equal(c.editado_por_nombre, null);
  });

  test("cambiar la tarifa no altera un cierre ya hecho; editarlo registra quién", async () => {
    await admin.from("branches").update({ pago_repartidor: 4000 }).eq("id", laPaz.id);
    await colab.from("orders").update({ estado: "completado" }).in("id", ids);
    const { data: c, error } = await admin.rpc("save_cash_closing", {
      p_branch_id: laPaz.id,
      p_fecha: FECHA,
      p_declarado: { fondo_inicial: 20000, efectivo_contado: 26000, tarjetas: 5000, transferencias: transf.total + delivery.total, otros_egresos: [{ detalle: "Hielo", monto: 1500 }] },
    });
    assert.ifError(error);
    assert.deepEqual([c.tarifa_repartidor, c.total_repartidor], [2500, 2500]);
    assert.equal(c.pedidos_pendientes, 0);
    assert.equal(c.diferencia_total, 0);
    assert.equal(c.cerrado_por_nombre, nombres["colab.pruebas@example.com"]);
    assert.equal(c.editado_por_nombre, nombres["agente.pruebas@example.com"]);

    const { data: s } = await colab.rpc("cash_summary", { p_branch_id: laPaz.id, p_fecha: FECHA });
    assert.equal(s.tarifa_repartidor, 2500, "el resumen usa la tarifa del cierre");
  });

  test("solo el administrador borra un cierre", async () => {
    await colab.from("cash_closings").delete().eq("fecha", FECHA);
    const { data } = await admin.from("cash_closings").select("id").eq("fecha", FECHA);
    assert.equal(data.length, 1);
  });

  test("rechaza montos negativos", async () => {
    const { error } = await colab.rpc("save_cash_closing", { p_branch_id: laPaz.id, p_fecha: FECHA, p_declarado: { efectivo_contado: -1 } });
    assert.equal(error?.code, "22023");
  });
});
