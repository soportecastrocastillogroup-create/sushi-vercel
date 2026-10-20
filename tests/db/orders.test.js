// Pruebas de integración contra Pedidos Desarrollo (PRD 02 · Etapas 1 y 2):
// RLS de pedidos, create_order, cupo por hora y pedidos simultáneos.
//
// Requiere .env.local (Pedidos Desarrollo) y credenciales-prueba.local
// (scripts/seed-test-accounts.mjs). Se niega a correr contra otro proyecto.
// Crea pedidos en una fecha de 2031 y los borra al terminar; cada corrida
// consume algunos números de pedido.
//
// Run: npm run test:db
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEV_REF = "ikzprpnpyvbwsxiqprdt";
const root = new URL("../../", import.meta.url);

const env = Object.fromEntries(
  readFileSync(new URL(".env.local", root), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
if (!env.VITE_SUPABASE_URL?.includes(DEV_REF)) {
  throw new Error(".env.local no apunta a Pedidos Desarrollo. No se corren las pruebas.");
}

const creds = Object.fromEntries(
  readFileSync(new URL("credenciales-prueba.local", root), "utf8")
    .split("\n")
    .filter((l) => l.includes(" / "))
    .map((l) => {
      const [rol, rest] = l.split(": ");
      const [email, password] = rest.split(" / ");
      return [rol, { email, password }];
    })
);

const client = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function login(rol) {
  const c = client();
  const { error } = await c.auth.signInWithPassword(creds[rol]);
  if (error) throw new Error(`No se pudo entrar como ${rol}: ${error.message}`);
  return c;
}

// Una fecha de 2031 distinta en cada corrida, para no chocar con datos reales.
const FECHA = (() => {
  const d = new Date(Date.UTC(2031, 0, 1) + Math.floor(Math.random() * 360) * 86400000);
  return d.toISOString().split("T")[0];
})();

const pedido = (sucursal, horario, extra = {}) => ({
  sucursal,
  tipo: "retiro",
  fecha: FECHA,
  horario,
  fuente: "presencial",
  cliente: { nombre: "Prueba automática", telefono: "" },
  ...extra,
});
const ITEM = { cartId: "t1", productId: "test", nombre: "Producto de prueba", precio: 1000, qty: 1, cambios: [] };

const crear = (c, order, items = [ITEM], forzar = false) =>
  c.rpc("create_order", { p_order: order, p_items: items, p_forzar: forzar });

let anon, admin, colab;
let cuposOriginales = [];

before(async () => {
  anon = client();
  admin = await login("administrador");
  colab = await login("colaborador");
  const { data, error } = await admin.from("branches").select("id, name, cupo_por_hora");
  if (error) throw error;
  cuposOriginales = data;
});

after(async () => {
  if (!admin) return;
  await admin.from("orders").delete().eq("fecha", FECHA);
  for (const b of cuposOriginales) {
    await admin.from("branches").update({ cupo_por_hora: b.cupo_por_hora }).eq("id", b.id);
  }
  const { data } = await admin.from("orders").select("id").eq("fecha", FECHA);
  assert.equal(data.length, 0, "quedaron pedidos de prueba sin borrar");
});

const setCupo = async (sucursal, cupo) => {
  const { error } = await admin.from("branches").update({ cupo_por_hora: cupo }).eq("name", sucursal);
  if (error) throw error;
};

describe("Etapa 1 · acceso público (anon)", () => {
  test("no lee pedidos ni ítems ni días desbloqueados", async () => {
    const { data: creado, error } = await crear(colab, pedido("La Paz", "17:00"), [ITEM], true);
    assert.ifError(error);
    for (const t of ["orders", "order_items", "unlocked_dates"]) {
      const { data, error: e } = await anon.from(t).select("*").limit(5);
      assert.ifError(e);
      assert.equal(data.length, 0, `anon ve filas de ${t}`);
    }
    const { data: visto } = await colab.from("orders").select("id").eq("id", creado.id);
    assert.equal(visto.length, 1, "el personal sí ve el pedido");
  });

  test("no inserta pedidos ni días desbloqueados", async () => {
    const r1 = await anon.from("orders").insert({ order_number: "#ANON", sucursal: "La Paz", tipo: "retiro", fecha: FECHA, horario: "17:00" });
    assert.equal(r1.error?.code, "42501");
    const r2 = await anon.from("unlocked_dates").insert({ date: FECHA });
    assert.equal(r2.error?.code, "42501");
  });

  test("lee product_stock pero no lo modifica", async () => {
    const { data, error } = await anon.from("product_stock").select("product_id, available").limit(1);
    assert.ifError(error);
    assert.equal(data.length, 1);
    const { data: upd } = await anon
      .from("product_stock")
      .update({ available: data[0].available })
      .eq("product_id", data[0].product_id)
      .select();
    assert.equal(upd?.length ?? 0, 0);
  });

  test("no ejecuta create_order ni get_next_order_number", async () => {
    const r1 = await crear(anon, pedido("La Paz", "17:00"));
    assert.equal(r1.error?.code, "42501");
    const r2 = await anon.rpc("get_next_order_number");
    assert.equal(r2.error?.code, "42501");
  });

  test("app_settings ya no tiene PIN ni max_por_horario", async () => {
    for (const col of ["admin_pin", "kitchen_pin", "reportes_pin", "max_por_horario"]) {
      const { error } = await anon.from("app_settings").select(col);
      assert.equal(error?.code, "42703", `${col} sigue existiendo`);
    }
  });
});

describe("Etapa 1 · create_order", () => {
  test("un colaborador crea un delivery y el total lo calcula la base", async () => {
    const { data: s } = await colab.from("app_settings").select("costo_delivery").eq("id", 1).single();
    const items = [
      { ...ITEM, precio: 5000, qty: 2, cambios: [{ nombre: "Extra", precio: 1000 }] },
      { ...ITEM, cartId: "t2", precio: 3000 },
    ];
    const { data, error } = await crear(colab, pedido("Loncoche", "17:15", { tipo: "delivery", direccion: "Calle 1" }), items);
    assert.ifError(error);
    assert.equal(data.total, (5000 + 1000) * 2 + 3000 + s.costo_delivery);
    assert.equal(data.order_items.length, 2);
    assert.match(data.order_number, /^#\d+/);
  });

  test("el personal no puede insertar pedidos directo", async () => {
    const { error } = await admin
      .from("orders")
      .insert({ order_number: "#DIRECTO", sucursal: "La Paz", tipo: "retiro", fecha: FECHA, horario: "17:00" });
    assert.equal(error?.code, "42501");
  });

  test("rechaza datos inválidos", async () => {
    const casos = [
      [pedido("Otra", "17:00"), [ITEM]],
      [pedido("La Paz", "17:00", { tipo: "otro" }), [ITEM]],
      [pedido("La Paz", ""), [ITEM]],
      [pedido("La Paz", "17:00"), []],
      [pedido("La Paz", "17:00"), [{ ...ITEM, qty: 0 }]],
      [pedido("La Paz", "17:00"), [{ ...ITEM, precio: -1 }]],
    ];
    for (const [order, items] of casos) {
      const { error } = await crear(colab, order, items);
      assert.equal(error?.code, "22023", JSON.stringify(order) + JSON.stringify(items));
    }
  });
});

describe("Etapa 2 · cupo por hora y por sucursal", () => {
  test("solo el administrador cambia el cupo", async () => {
    const { data } = await colab.from("branches").update({ cupo_por_hora: 99 }).eq("name", "La Paz").select();
    assert.equal(data?.length ?? 0, 0);
    const { data: b } = await admin.from("branches").select("cupo_por_hora").eq("name", "La Paz").single();
    assert.notEqual(b.cupo_por_hora, 99);
  });

  test("un bloque lleno rechaza pedidos sin afectar a la otra sucursal", async () => {
    await setCupo("La Paz", 2);
    await setCupo("Loncoche", 2);
    assert.ifError((await crear(colab, pedido("La Paz", "20:00"))).error);
    const segundo = await crear(colab, pedido("La Paz", "20:45"));
    assert.ifError(segundo.error);

    // El tercero del bloque de las 20 se rechaza, aunque sea otra franja.
    const lleno = await crear(colab, pedido("La Paz", "20:15"));
    assert.equal(lleno.error?.code, "SL409");
    assert.deepEqual(JSON.parse(lleno.error.details), { hora: 20, pedidos: 2, cupo: 2 });

    // Un completado sigue contando.
    await colab.from("orders").update({ estado: "completado" }).eq("id", segundo.data.id);
    assert.equal((await crear(colab, pedido("La Paz", "20:30"))).error?.code, "SL409");

    // Loncoche tiene su propio cupo, y el bloque de las 21 de La Paz está libre.
    assert.ifError((await crear(colab, pedido("Loncoche", "20:15"))).error);
    assert.ifError((await crear(colab, pedido("La Paz", "21:00"))).error);
  });

  test("el personal puede pasarse del cupo con p_forzar", async () => {
    await setCupo("La Paz", 2);
    const { data, error } = await crear(colab, pedido("La Paz", "20:30"), [ITEM], true);
    assert.ifError(error);
    const { data: bloque } = await colab
      .from("orders")
      .select("id")
      .eq("fecha", FECHA)
      .eq("sucursal", "La Paz")
      .like("horario", "20:%");
    assert.equal(bloque.length, 3);
    assert.ok(data.id);
  });

  test("subir el cupo libera el bloque", async () => {
    await setCupo("La Paz", 4);
    assert.ifError((await crear(colab, pedido("La Paz", "20:15"))).error);
    assert.equal((await crear(colab, pedido("La Paz", "20:15"))).error?.code, "SL409");
  });

  test("pedidos simultáneos al último cupo: entra solo uno", async () => {
    await setCupo("Loncoche", 2);
    assert.ifError((await crear(colab, pedido("Loncoche", "19:00"))).error);
    const otros = await Promise.all([admin, colab, await login("colaborador"), await login("administrador"), await login("colaborador")]
      .map((c, i) => crear(c, pedido("Loncoche", `19:${String(i * 10).padStart(2, "0")}`))));
    const ok = otros.filter((r) => !r.error);
    const llenos = otros.filter((r) => r.error?.code === "SL409");
    assert.equal(ok.length, 1, JSON.stringify(otros.map((r) => r.error?.message ?? "ok")));
    assert.equal(llenos.length, otros.length - 1);
  });
});
