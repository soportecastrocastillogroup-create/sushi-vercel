// Pruebas de integración de las cuentas de clientes contra Pedidos Desarrollo
// (PRD 02 · Etapa 5): ficha por trigger, RLS de datos personales, pedido con
// cuenta validado en la base y gestión de cuentas con manage-customers.
//
// Usa cliente.pruebas y cliente2.pruebas (scripts/seed-test-accounts.mjs).
// Los clientes solo pueden pedir para hoy, así que estas pruebas crean pedidos
// para hoy y los borran al terminar. Si hoy es un día cerrado lo desbloquean, y
// si ya no quedan bloques agregan la franja 23:45; ambas cosas se revierten al
// final. No corren después de las 23:00 (hora de Chile).
// Run: npm run test:db
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { anonClient, callFunction, credentials, horaChile, isoChile, login } from "./helpers.js";
import { bloqueDe } from "../../src/utils/dates.js";

let admin, colab, cliente, cliente2, yo, producto, promo, fecha, bloques, cupoOriginal, desbloqueado, franjaExtra;
const ids = [];

const pedido = (extra = {}) => ({
  sucursal: "La Paz",
  tipo: "retiro",
  fecha,
  horario: bloques[0].bloque,
  metodoPago: "transferencia",
  cliente: { nombre: "Cliente Pruebas", telefono: "+56900000001" },
  ...extra,
});
const crear = async (c, order, items = [{ productId: producto.id, qty: 1 }], forzar = false) => {
  const r = await c.rpc("create_order", { p_order: order, p_items: items, p_forzar: forzar });
  if (r.data?.id) ids.push(r.data.id);
  return r;
};

before(async () => {
  admin = await login("administrador");
  colab = await login("colaborador");
  cliente = await login("cliente");
  cliente2 = await login("cliente2");
  ({ data: yo } = await cliente.from("customers").select("*").single());

  // Un producto sin opciones y una promo con opciones, disponibles en La Paz.
  const { data: prods } = await colab
    .from("products")
    .select("id, nombre, precio, active, categories(active), product_branches(branches(name)), promo_options(label, choices)")
    .eq("active", true);
  const { data: stock } = await colab.from("product_stock").select("product_id, available");
  const agotado = new Set(stock.filter((s) => !s.available).map((s) => s.product_id));
  const ok = prods.filter(
    (p) => p.categories?.active !== false && !agotado.has(p.id) && p.product_branches.some((pb) => pb.branches?.name === "La Paz")
  );
  producto = ok.find((p) => p.promo_options.length === 0);
  promo = ok.find((p) => p.promo_options.length > 0);

  // Hoy, abierto y con al menos un bloque que no haya pasado.
  fecha = isoChile(0);
  const ahora = horaChile();
  assert.ok(ahora > "00:30" && ahora < "23:00", "estas pruebas no corren después de las 23:00 (hora de Chile)");
  const { data: blocked } = await colab.from("blocked_weekdays").select("dow");
  const { data: unlocked } = await colab.from("unlocked_dates").select("date");
  if (blocked.some((b) => b.dow === new Date(fecha + "T12:00:00Z").getUTCDay()) && !unlocked.some((u) => u.date === fecha)) {
    const { error } = await colab.from("unlocked_dates").insert({ date: fecha });
    assert.ifError(error);
    desbloqueado = fecha;
  }
  let { data: s } = await cliente.rpc("available_blocks", { p_sucursal: "La Paz", p_fecha: fecha });
  if (s.length === 0) {
    const { error } = await admin.from("time_slots").insert({ slot: "23:45", sort_order: 999 });
    assert.ifError(error);
    franjaExtra = "23:45";
    ({ data: s } = await cliente.rpc("available_blocks", { p_sucursal: "La Paz", p_fecha: fecha }));
  }
  bloques = s;
  // Cupo alto mientras corren, para no depender de los pedidos de hoy (p. ej.
  // de scripts/seed-demo-data.mjs); la prueba de cupo lo baja.
  ({ data: { cupo_por_bloque: cupoOriginal } } = await admin.from("branches").select("cupo_por_bloque").eq("name", "La Paz").single());
  await admin.from("branches").update({ cupo_por_bloque: 99 }).eq("name", "La Paz");
});

after(async () => {
  if (!admin) return;
  if (ids.length) await admin.from("orders").delete().in("id", ids);
  await admin.from("branches").update({ cupo_por_bloque: cupoOriginal }).eq("name", "La Paz");
  if (desbloqueado) await colab.from("unlocked_dates").delete().eq("date", desbloqueado);
  if (franjaExtra) await admin.from("time_slots").delete().eq("slot", franjaExtra);
  if (yo) {
    await admin
      .from("customers")
      .update({ nombre: yo.nombre, telefono: yo.telefono, direccion: yo.direccion, acepta_marketing: yo.acepta_marketing, consentimiento_at: yo.consentimiento_at, consentimiento_origen: yo.consentimiento_origen, baja_at: yo.baja_at })
      .eq("id", yo.id);
  }
  const { data } = ids.length ? await admin.from("orders").select("id").in("id", ids) : { data: [] };
  assert.equal(data.length, 0, "quedaron pedidos de prueba");
});

describe("Etapa 5 · ficha y datos personales", () => {
  test("el registro crea la ficha con correo normalizado", () => {
    assert.equal(yo.email, credentials("cliente").email);
    assert.equal(yo.nombre, "Cliente Pruebas");
    assert.ok(yo.auth_user_id);
  });

  test("cada cliente ve solo su ficha; el colaborador y anon no ven fichas; el administrador sí", async () => {
    const { data: propias } = await cliente.from("customers").select("email");
    assert.deepEqual(propias.map((c) => c.email), [credentials("cliente").email]);
    const { data: c2 } = await cliente2.from("customers").select("email").eq("id", yo.id);
    assert.equal(c2.length, 0);
    const { data: colabVe } = await colab.from("customers").select("id");
    assert.equal(colabVe.length, 0);
    const { data: anonVe, error } = await anonClient().from("customers").select("id");
    assert.ok(error || anonVe.length === 0);
    const { data: adminVe } = await admin.from("customers").select("id");
    assert.ok(adminVe.length >= 2);
  });

  test("el cliente edita sus datos y el consentimiento solo con update_my_customer", async () => {
    const { data: directo } = await cliente.from("customers").update({ notas: "hack", bloqueado: true }).eq("id", yo.id).select();
    assert.equal(directo?.length ?? 0, 0);

    const { data: c1, error } = await cliente.rpc("update_my_customer", { p_datos: { nombre: "Cliente Editado", acepta_marketing: true, notas: "x" } });
    assert.ifError(error);
    assert.equal(c1.nombre, "Cliente Editado");
    assert.equal(c1.notas, yo.notas);
    assert.equal(c1.acepta_marketing, true);
    assert.equal(c1.consentimiento_origen, "Mi cuenta");
    assert.ok(c1.consentimiento_at);

    const { data: c2 } = await cliente.rpc("update_my_customer", { p_datos: { acepta_marketing: false } });
    assert.equal(c2.acepta_marketing, false);
    assert.ok(c2.baja_at);
  });

  test("un cliente no ve datos del panel", async () => {
    for (const t of ["inventory_items", "inventory_movements", "cash_closings", "staff_profiles"]) {
      const { data } = await cliente.from(t).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, `el cliente ve ${t}`);
    }
    const { error } = await cliente.rpc("cash_summary", { p_branch_id: "x", p_fecha: fecha });
    assert.equal(error?.code, "42501");
  });
});

describe("Etapa 5 · pedido con cuenta", () => {
  test("los precios y nombres los pone la base, no el navegador", async () => {
    const { data, error } = await crear(cliente, pedido(), [{ productId: producto.id, qty: 2, precio: 1, nombre: "Gratis" }]);
    assert.ifError(error);
    assert.equal(data.total, producto.precio * 2);
    assert.equal(data.order_items[0].nombre, producto.nombre);
    assert.equal(data.order_items[0].precio, producto.precio);
    assert.equal(data.fuente, "cuenta_web");
    assert.equal(data.estado, "abierto");
    assert.equal(data.customer_id, yo.id);
    assert.equal(data.cliente_email, yo.email);
    // La hora la pone la base: la estimada (o el inicio, si el bloque es más tarde), dentro del bloque elegido.
    assert.equal(bloqueDe(data.horario), bloques[0].bloque);
    assert.ok(data.horario >= bloques[0].horario, `${data.horario} antes de ${bloques[0].horario}`);
  });

  test("hoy, el bloque actual sale con la hora estimada y uno más tarde con su inicio", () => {
    const [actual, ...despues] = bloques;
    const estimada = horaChile(20);
    if (actual.bloque <= estimada) assert.ok(actual.horario >= estimada && bloqueDe(actual.horario) === actual.bloque, JSON.stringify(actual));
    for (const b of despues) assert.equal(b.horario, b.bloque);
  });

  test("acepta efectivo, débito y transferencia, también en delivery", async () => {
    for (const metodoPago of ["efectivo", "debito"]) {
      const { error } = await crear(cliente, pedido({ tipo: "delivery", direccion: "Calle 123", metodoPago }));
      assert.ifError(error);
    }
    await colab.from("orders").update({ estado: "completado" }).in("id", ids);
  });

  test("valida opciones de promo", async () => {
    if (!promo) return;
    const o = promo.promo_options[0];
    const ok = await crear(cliente, pedido(), [{ productId: promo.id, qty: 1, opciones: [`${o.label}: ${o.choices[0]}`] }]);
    assert.ifError(ok.error);
    assert.equal(ok.data.order_items[0].opciones_str, `${o.label}: ${o.choices[0]}`);
    const mal = await crear(cliente, pedido(), [{ productId: promo.id, qty: 1, opciones: [`${o.label}: Caviar`] }]);
    assert.equal(mal.error?.code, "SL422");
    // Deja espacio para las pruebas de límite: completa los pedidos creados.
    await colab.from("orders").update({ estado: "completado" }).in("id", ids);
  });

  test("rechaza pedidos incompletos o fuera de reglas", async () => {
    const casos = [
      pedido({ cliente: { nombre: "Ana", telefono: "" } }),
      pedido({ tipo: "delivery", direccion: "" }),
      pedido({ metodoPago: "pago_contra_entrega" }),
      pedido({ horario: "16:07" }),
      pedido({ fecha: isoChile(-1) }),
      pedido({ fecha: isoChile(1) }),
    ];
    // Un bloque que ya pasó (si hoy hay alguno antes del actual).
    const pasado = bloqueDe(horaChile(-60));
    if (pasado >= "17:00" && pasado < bloques[0].bloque) casos.push(pedido({ horario: pasado }));
    for (const o of casos) {
      const { error } = await crear(cliente, o);
      assert.equal(error?.code, "SL422", JSON.stringify(o));
    }
    for (const items of [[{ productId: "no-existe", qty: 1 }], [{ productId: producto.id, qty: 0 }]]) {
      const { error } = await crear(cliente, pedido(), items);
      assert.equal(error?.code, "SL422", JSON.stringify(items));
    }
  });

  test("un cliente no puede pasarse del cupo aunque pida p_forzar", async () => {
    await admin.from("branches").update({ cupo_por_bloque: 1 }).eq("name", "La Paz");
    const ultimo = bloques.at(-1).bloque;
    const lleno = await crear(colab, { ...pedido({ horario: ultimo }), fuente: "presencial" }, [{ productId: producto.id, nombre: "x", precio: 1000, qty: 1 }], true);
    assert.ifError(lleno.error);
    const { data: disp } = await cliente.rpc("available_blocks", { p_sucursal: "La Paz", p_fecha: fecha });
    assert.equal(disp.find((b) => b.bloque === ultimo).disponible, false);
    const r = await crear(cliente, pedido({ horario: ultimo }), undefined, true);
    assert.equal(r.error?.code, "SL409");
    await admin.from("branches").update({ cupo_por_bloque: 99 }).eq("name", "La Paz");
  });

  test("máximo 3 pedidos sin completar por cuenta", async () => {
    for (let i = 0; i < 3; i++) assert.ifError((await crear(cliente, pedido())).error);
    const r = await crear(cliente, pedido());
    assert.equal(r.error?.code, "SL429");
  });

  test("cada cliente ve solo sus pedidos y no los edita", async () => {
    const { data: mios } = await cliente.from("orders").select("id, customer_id, order_items(id)");
    assert.ok(mios.length >= 3 && mios.every((o) => o.customer_id === yo.id && o.order_items.length > 0));
    const { data: ajenos } = await cliente2.from("orders").select("id").in("id", ids);
    assert.equal(ajenos.length, 0);
    const { data: upd } = await cliente.from("orders").update({ total: 1 }).eq("id", mios[0].id).select();
    assert.equal(upd?.length ?? 0, 0);
    const { data: del } = await cliente.from("orders").delete().eq("id", mios[0].id).select();
    assert.equal(del?.length ?? 0, 0);
  });
});

describe("Etapa 6 · cifras de Susheros", () => {
  test("el administrador ve las compras de cada cliente; el colaborador y otros clientes no", async () => {
    const { data: mias } = await admin.from("customer_stats").select("*").eq("customer_id", yo.id).single();
    const { data: pedidos } = await admin.from("orders").select("total, estado").eq("customer_id", yo.id);
    assert.equal(mias.compras, pedidos.length);
    assert.equal(mias.gasto, pedidos.reduce((n, o) => n + o.total, 0));
    assert.equal(mias.en_curso, pedidos.filter((o) => o.estado !== "completado").length);
    const { data: colabVe } = await colab.from("customer_stats").select("*");
    assert.equal(colabVe.length, 0);
    const { data: c2Ve } = await cliente2.from("customer_stats").select("*").eq("customer_id", yo.id);
    assert.equal(c2Ve.length, 0);
  });
});

describe("Etapa 5 · manage-customers", () => {
  test("solo el administrador la usa", async () => {
    const r = await callFunction(colab, "manage-customers", { action: "set_blocked", customer_id: yo.id, bloqueado: true });
    assert.equal(r.status, 403);
  });

  test("bloquear corta el acceso y desbloquear lo devuelve", async () => {
    assert.equal((await callFunction(admin, "manage-customers", { action: "set_blocked", customer_id: yo.id, bloqueado: true })).status, 200);
    const bloqueado = anonClient();
    const { error } = await bloqueado.auth.signInWithPassword(credentials("cliente"));
    assert.match(error?.message ?? "", /banned/i);
    assert.equal((await callFunction(admin, "manage-customers", { action: "set_blocked", customer_id: yo.id, bloqueado: false })).status, 200);
    assert.ifError((await anonClient().auth.signInWithPassword(credentials("cliente"))).error);
  });

  test("restablecer contraseña", async () => {
    const nueva = `Temp-${Date.now()}`;
    assert.equal((await callFunction(admin, "manage-customers", { action: "reset_password", customer_id: yo.id, password: nueva })).status, 200);
    assert.ifError((await anonClient().auth.signInWithPassword({ email: yo.email, password: nueva })).error);
    // Se vuelve a la de credenciales-prueba.local.
    assert.equal(
      (await callFunction(admin, "manage-customers", { action: "reset_password", customer_id: yo.id, password: credentials("cliente").password })).status,
      200
    );
  });

  test("cambiar el correo actualiza la cuenta y la ficha", async () => {
    const otro = `cliente.temp.${Date.now()}@example.com`;
    const r = await callFunction(admin, "manage-customers", { action: "update_email", customer_id: yo.id, email: ` ${otro.toUpperCase()} ` });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ifError((await anonClient().auth.signInWithPassword({ email: otro, password: credentials("cliente").password })).error);
    const back = await callFunction(admin, "manage-customers", { action: "update_email", customer_id: yo.id, email: yo.email });
    assert.equal(back.status, 200);
    const { data } = await admin.from("customers").select("email").eq("id", yo.id).single();
    assert.equal(data.email, yo.email);
  });
});
