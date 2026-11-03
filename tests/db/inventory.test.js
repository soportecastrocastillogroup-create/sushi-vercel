// Pruebas de integración del inventario contra Pedidos Desarrollo
// (PRD 02 · Etapa 3): RLS, signo de los movimientos, autoría, stock por
// sucursal, semáforo, planilla del día y alertas de críticos.
//
// Crea un insumo de prueba con movimientos en 2031 y lo borra al terminar.
// Run: npm run test:db
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonClient, login } from "./helpers.js";

const NOMBRE = `Insumo de prueba ${Date.now()}`;
const D1 = "2031-06-10";
const D2 = "2031-06-11";

let anon, admin, colab, item, branches, laPaz, loncoche, nombres;

const mover = (c, tipo, cantidad, extra = {}) =>
  c
    .from("inventory_movements")
    .insert({ item_id: item.id, branch_id: laPaz, tipo, cantidad, fecha: D1, ...extra })
    .select()
    .single();

const stock = async (branchId) => {
  const { data, error } = await colab.from("inventory_stock").select("*").eq("item_id", item.id).eq("branch_id", branchId).single();
  if (error) throw error;
  return data;
};

before(async () => {
  anon = anonClient();
  admin = await login("administrador");
  colab = await login("colaborador");
  ({ data: branches } = await admin.from("branches").select("id, name"));
  laPaz = branches.find((b) => b.name === "La Paz").id;
  loncoche = branches.find((b) => b.name === "Loncoche").id;
  const { data: perfiles } = await admin.from("staff_profiles").select("email, nombre");
  nombres = Object.fromEntries(perfiles.map((p) => [p.email, p.nombre]));
});

after(async () => {
  if (!item) return;
  await admin.from("inventory_movements").delete().eq("item_id", item.id);
  await admin.from("inventory_items").delete().eq("id", item.id);
  const { data } = await admin.from("inventory_items").select("id").eq("id", item.id);
  assert.equal(data.length, 0, "quedó el insumo de prueba");
});

describe("Etapa 3 · configuración y acceso", () => {
  test("el colaborador no crea insumos; el administrador sí", async () => {
    const r = await colab.from("inventory_items").insert({ nombre: NOMBRE, unidad: "kg" });
    assert.equal(r.error?.code, "42501");

    const { data, error } = await admin.from("inventory_items").insert({ nombre: NOMBRE, unidad: "kg" }).select().single();
    assert.ifError(error);
    item = data;
    const { error: e2 } = await admin.from("inventory_item_branches").insert([
      { item_id: item.id, branch_id: laPaz, stock_minimo: 10 },
      { item_id: item.id, branch_id: loncoche, stock_minimo: 4 },
    ]);
    assert.ifError(e2);
  });

  test("no se repite el nombre (sin importar mayúsculas)", async () => {
    const { error } = await admin.from("inventory_items").insert({ nombre: ` ${NOMBRE.toUpperCase()} `, unidad: "kg" });
    assert.equal(error?.code, "23505");
  });

  test("anon no ve insumos, movimientos, stock ni planilla", async () => {
    for (const t of ["inventory_items", "inventory_item_branches", "inventory_movements", "inventory_stock"]) {
      const { data, error } = await anon.from(t).select("*").limit(1);
      assert.ok(error || data.length === 0, `anon lee ${t}`);
    }
    const { error } = await anon.rpc("inventory_daily", { p_branch_id: laPaz, p_fecha: D1 });
    assert.equal(error?.code, "42501");
  });
});

describe("Etapa 3 · movimientos y stock", () => {
  test("el signo depende del tipo", async () => {
    assert.equal((await mover(colab, "ingreso", -1)).error?.code, "23514");
    assert.equal((await mover(colab, "uso", 1)).error?.code, "23514");
    assert.equal((await mover(colab, "merma", 2)).error?.code, "23514");
    assert.equal((await mover(colab, "ajuste", 0)).error?.code, "23514");
  });

  test("la autoría la pone la base, no el navegador", async () => {
    const { data, error } = await mover(colab, "ingreso", 12, { created_by_nombre: "Otra persona", fecha: D1 });
    assert.ifError(error);
    assert.equal(data.created_by_nombre, nombres["colab.pruebas@example.com"]);
    assert.equal(data.updated_by_nombre, null);

    const { data: upd, error: e2 } = await admin
      .from("inventory_movements")
      .update({ observacion: "corregido", created_by_nombre: "Hackeo" })
      .eq("id", data.id)
      .select()
      .single();
    assert.ifError(e2);
    assert.equal(upd.created_by_nombre, nombres["colab.pruebas@example.com"]);
    assert.equal(upd.updated_by_nombre, nombres["agente.pruebas@example.com"]);
    assert.ok(upd.updated_at);
  });

  test("semáforo: amarillo cerca del mínimo, verde sobre él, rojo bajo él", async () => {
    // 12 con mínimo 10: sobre el mínimo pero a menos de un 25 % (12,5).
    let s = await stock(laPaz);
    assert.equal(Number(s.stock), 12);
    assert.equal(s.semaforo, "amarillo");

    assert.ifError((await mover(colab, "ingreso", 8, { fecha: D2 })).error);
    s = await stock(laPaz);
    assert.equal(Number(s.stock), 20);
    assert.equal(s.semaforo, "verde");

    assert.ifError((await mover(colab, "uso", -9.5, { fecha: D2 })).error);
    assert.ifError((await mover(colab, "merma", -1, { fecha: D2 })).error);
    s = await stock(laPaz);
    assert.equal(Number(s.stock), 9.5);
    assert.equal(s.semaforo, "rojo");
  });

  test("cada sucursal tiene su stock", async () => {
    const s = await stock(loncoche);
    assert.equal(Number(s.stock), 0);
    assert.equal(s.semaforo, "rojo");
  });

  test("la planilla del día separa inicio, ingresos, uso, merma y ajuste", async () => {
    assert.ifError((await mover(colab, "ajuste", 0.5, { fecha: D2 })).error);
    const { data, error } = await colab.rpc("inventory_daily", { p_branch_id: laPaz, p_fecha: D2 });
    assert.ifError(error);
    const r = data.find((x) => x.item_id === item.id);
    assert.deepEqual(
      [r.inicio, r.ingresos, r.usos, r.mermas, r.ajustes, r.actual].map(Number),
      [12, 8, 9.5, 1, 0.5, 10]
    );
    assert.equal(r.semaforo, "amarillo");

    const { data: d1 } = await colab.rpc("inventory_daily", { p_branch_id: laPaz, p_fecha: D1 });
    const r1 = d1.find((x) => x.item_id === item.id);
    assert.deepEqual([r1.inicio, r1.ingresos, r1.actual].map(Number), [0, 12, 12]);
  });

  test("un crítico bajo el mínimo aparece en las alertas y sale al reponer", async () => {
    await admin.from("inventory_items").update({ critico: true }).eq("id", item.id);
    const { data: m } = await mover(colab, "uso", -5, { fecha: D2 });
    const alertas = async () => {
      const { data } = await colab.from("inventory_stock").select("item_id, sucursal").eq("critico", true).eq("semaforo", "rojo");
      return data.filter((a) => a.item_id === item.id).map((a) => a.sucursal).sort();
    };
    assert.deepEqual(await alertas(), ["La Paz", "Loncoche"]);

    // Borrar el uso lo deja de nuevo en 10 (amarillo): sale la alerta de La Paz.
    assert.ifError((await colab.from("inventory_movements").delete().eq("id", m.id)).error);
    assert.deepEqual(await alertas(), ["Loncoche"]);
  });

  test("un insumo con movimientos no se puede borrar", async () => {
    const { error } = await admin.from("inventory_items").delete().eq("id", item.id);
    assert.equal(error?.code, "23503");
  });
});
