/**
 * Datos de demostración para Pedidos Desarrollo: Susheros, pedidos de las
 * últimas tres semanas, de hoy y del próximo día abierto, insumos con
 * movimientos y algunos cierres de caja. Sirve para mostrar el sistema.
 *
 * Entra con las cuentas de prueba (credenciales-prueba.local) y usa las mismas
 * funciones que la app (create_order, save_cash_closing, movimientos), así que
 * los totales, los números de pedido y la autoría quedan como en uso real. Se
 * niega a correr fuera de Pedidos Desarrollo (tests/db/helpers.js).
 *
 * Cada ejecución borra los datos de demostración anteriores y los vuelve a
 * crear. Marcas para reconocerlos:
 *   - pedidos: order_items.cart_id empieza con "demo-"
 *   - Susheros: correo @demo.example.com
 *   - insumos: el nombre y el orden (900, 901…) de la lista INSUMOS; se borran
 *     con sus movimientos. Solo el orden no basta: un insumo nuevo creado en
 *     el panel toma el último orden + 1 (912, 913…).
 *   - cierres de caja: observaciones empiezan con "[demo]"
 * Si hoy es un día cerrado, lo desbloquea (eso no se revierte al limpiar).
 *
 * Run:
 *   node scripts/seed-demo-data.mjs           # borra y vuelve a crear
 *   node scripts/seed-demo-data.mjs --clean   # solo borra
 */
import { horaChile, isoChile, login } from "../tests/db/helpers.js";
import { calcularCuadratura } from "../src/utils/caja.js";
import { bloqueDe } from "../src/utils/dates.js";

const DOMINIO = "@demo.example.com";
const DEMO_SORT = 900;

// [nombre, unidad, crítico, mínimo, uso diario aprox.]
const INSUMOS = [
  ["Salmón", "kg", true, 4, 2.5],
  ["Arroz", "kg", true, 10, 6],
  ["Palta", "kg", true, 3, 1.5],
  ["Queso crema", "kg", true, 3, 1.2],
  ["Nori", "paquetes", true, 4, 1],
  ["Camarón", "kg", false, 2, 0.8],
  ["Kanikama", "kg", false, 1.5, 0.5],
  ["Panko", "kg", false, 2, 0.6],
  ["Salsa de soya", "litros", false, 3, 0.8],
  ["Aceite", "litros", false, 5, 1.5],
  ["Envases delivery", "unidades", false, 40, 18],
  ["Palillos", "pares", false, 100, 40],
];

// Pseudoaleatorio con semilla: cada ejecución genera los mismos datos.
let semilla = 2610;
const rnd = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const uno = (arr) => arr[Math.floor(rnd() * arr.length)];
const must = ({ data, error }, que) => {
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
};

const admin = await login("administrador");
const colab = await login("colaborador");

// ── Limpieza ──────────────────────────────────────────────────────────────────
async function limpiar() {
  const items = must(await admin.from("order_items").select("order_id").like("cart_id", "demo-%"), "leer pedidos demo");
  const ids = [...new Set(items.map((i) => i.order_id))];
  for (let i = 0; i < ids.length; i += 100) must(await admin.from("orders").delete().in("id", ids.slice(i, i + 100)), "borrar pedidos");
  must(await admin.from("cash_closings").delete().like("observaciones", "[demo]%"), "borrar cierres");
  const demo = new Set(INSUMOS.map(([nombre], i) => `${nombre}|${DEMO_SORT + i}`));
  const insumos = must(await admin.from("inventory_items").select("id, nombre, sort_order").gte("sort_order", DEMO_SORT), "leer insumos demo")
    .filter((i) => demo.has(`${i.nombre}|${i.sort_order}`))
    .map((i) => i.id);
  if (insumos.length) {
    must(await admin.from("inventory_movements").delete().in("item_id", insumos), "borrar movimientos");
    must(await admin.from("inventory_item_branches").delete().in("item_id", insumos), "borrar mínimos");
    must(await admin.from("inventory_items").delete().in("id", insumos), "borrar insumos");
  }
  const clientes = must(await admin.from("customers").delete().like("email", `%${DOMINIO}`).select("id"), "borrar Susheros");
  console.log(`Borrado: ${ids.length} pedidos, ${insumos.length} insumos, ${clientes.length} Susheros.`);
}

await limpiar();
if (process.argv.includes("--clean")) process.exit(0);

// ── Datos base ────────────────────────────────────────────────────────────────
const hoy = isoChile(0);
const dow = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
const cerrados = new Set(must(await admin.from("blocked_weekdays").select("dow"), "días cerrados").map((d) => d.dow));
const slots = must(await admin.from("time_slots").select("slot").order("sort_order"), "franjas").map((s) => s.slot);
const branches = must(await admin.from("branches").select("id, name, cupo_por_bloque").eq("active", true).order("sort_order"), "sucursales");
const productos = must(
  await admin
    .from("products")
    .select("id, nombre, precio, piezas, categories(name), product_branches(branches(name)), promo_options(id)")
    .eq("active", true),
  "productos"
).filter((p) => p.promo_options.length === 0);
const carta = Object.fromEntries(
  branches.map((b) => [b.name, productos.filter((p) => p.product_branches.some((pb) => pb.branches?.name === b.name))])
);

if (cerrados.has(dow(hoy))) {
  const { error } = await colab.from("unlocked_dates").insert({ date: hoy });
  if (error && error.code !== "23505") throw new Error(`desbloquear hoy: ${error.message}`);
  if (!error) console.log(`Hoy (${hoy}) estaba cerrado: se desbloqueó.`);
}
const abierto = (iso) => iso === hoy || !cerrados.has(dow(iso));
const pasados = [];
for (let i = 21; i >= 1; i--) if (abierto(isoChile(-i))) pasados.push(isoChile(-i));
let proximo = 1;
while (!abierto(isoChile(proximo))) proximo++;
const futuro = isoChile(proximo);

// ── Susheros ──────────────────────────────────────────────────────────────────
const NOMBRES = [
  ["Camila", "Soto"], ["Matías", "Fuentes"], ["Valentina", "Muñoz"], ["Benjamín", "Rojas"],
  ["Francisca", "Contreras"], ["Diego", "Sepúlveda"], ["Javiera", "Morales"], ["Sebastián", "Torres"],
  ["Constanza", "Araya"], ["Nicolás", "Espinoza"], ["Catalina", "Vargas"], ["Felipe", "Castillo"],
  ["Antonia", "Reyes"], ["Tomás", "Navarro"], ["Fernanda", "Jara"], ["Ignacio", "Cárcamo"],
];
const CALLES = ["Caupolicán", "Lautaro", "Balmaceda", "Prat", "O'Higgins", "Pedro Montt", "Los Aromos", "Ercilla", "Freire", "Errázuriz"];
const fono = () => `+569${entre(10000000, 99999999)}`;
const sinTilde = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const NOTAS = ["", "", "", "Prefiere sin palta.", "Cliente frecuente de La Paz.", "Pide salsa extra.", ""];

const susheros = NOMBRES.map(([n, a], i) => {
  const alta = new Date(Date.now() - entre(5, 70) * 86400000).toISOString();
  const acepta = rnd() < 0.6;
  return {
    email: `${sinTilde(n)}.${sinTilde(a)}${DOMINIO}`,
    nombre: `${n} ${a}`,
    telefono: fono(),
    direccion: rnd() < 0.7 ? `${uno(CALLES)} ${entre(100, 1900)}, Loncoche` : "",
    acepta_marketing: acepta,
    consentimiento_at: acepta ? alta : null,
    consentimiento_origen: acepta ? "Registro web" : null,
    bloqueado: i === 9,
    notas: i === 9 ? "Bloqueado: dos pedidos sin retirar." : uno(NOTAS),
    created_at: alta,
  };
});
const fichas = must(await admin.from("customers").insert(susheros).select("id, email, nombre, telefono, direccion"), "crear Susheros");
// Algunos piden mucho, otros poco y dos nunca.
const peso = fichas.map((_, i) => (i < 4 ? 5 : i < 10 ? 2 : i < 14 ? 1 : 0));
const sushero = () => {
  const total = peso.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < fichas.length; i++) if ((r -= peso[i]) < 0) return fichas[i];
  return null;
};

// Los pedidos "Cuenta web" van a las cuentas de prueba (las fichas demo no tienen
// cuenta), y solo completados: así no cuentan para el límite de 3 en curso.
const cuentas = must(
  await admin.from("customers").select("id, email, nombre, telefono, direccion").in("email", ["cliente.pruebas@example.com", "cliente2.pruebas@example.com"]),
  "cuentas de prueba"
);

// ── Pedidos ───────────────────────────────────────────────────────────────────
const OBS = ["", "", "", "", "Sin sésamo, por favor", "Tocar el timbre", "Palillos extra", "Salsa agridulce aparte", "Es para un cumpleaños 🎂"];
const ANONIMOS = ["Pedro", "Carolina", "Luis", "Daniela", "Jorge", "Paula", "Andrés", "Marcela", "Cristián", "Bárbara", "Rodrigo", "Isidora"];
let contador = 0;

function itemsAlAzar(sucursal) {
  const lista = carta[sucursal];
  const promos = lista.filter((p) => p.categories?.name === "Promos");
  const resto = lista.filter((p) => p.categories?.name !== "Promos");
  const elegidos = [rnd() < 0.7 ? uno(promos) : uno(resto)];
  for (let i = entre(0, 2); i > 0; i--) elegidos.push(uno(resto));
  return elegidos.map((p) => ({
    cartId: `demo-${++contador}`,
    productId: p.id,
    nombre: p.nombre,
    precio: p.precio,
    piezas: p.piezas,
    cat: p.categories?.name ?? "",
    qty: p.categories?.name === "Bebestibles" ? entre(1, 3) : 1,
  }));
}

// Ocupación por sucursal, fecha y bloque (30 o 60 min, según la configuración).
const { bloque_minutos: MIN } = must(await admin.from("app_settings").select("bloque_minutos").eq("id", 1).single(), "configuración");
const cupoDe = Object.fromEntries(branches.map((b) => [b.name, b.cupo_por_bloque]));
const ocupacion = {};
const claveBloque = (sucursal, fecha, h) => `${sucursal}|${fecha}|${bloqueDe(h, MIN)}`;
async function crearPedido(fecha, sucursal, { horario, estado, forzar = false } = {}) {
  const libres = slots.filter((h) => (ocupacion[claveBloque(sucursal, fecha, h)] ?? 0) < cupoDe[sucursal]);
  const h = horario ?? uno(libres.length ? libres : slots);
  const conCuenta = estado === "completado" && cuentas.length && rnd() < 0.1;
  const cliente = conCuenta ? uno(cuentas) : rnd() < 0.6 ? sushero() : null;
  const tipo = rnd() < 0.35 ? "delivery" : "retiro";
  const fuente = conCuenta ? "cuenta_web" : uno(["whatsapp", "whatsapp", "whatsapp", "instagram", "presencial", "llamada"]);
  const order = {
    sucursal,
    tipo,
    fecha,
    horario: h,
    estado,
    fuente,
    metodoPago: uno(["transferencia", "transferencia", "efectivo", "debito"]),
    cliente: cliente ? { nombre: cliente.nombre, telefono: cliente.telefono } : { nombre: uno(ANONIMOS), telefono: fono() },
    direccion: tipo === "delivery" ? cliente?.direccion || `${uno(CALLES)} ${entre(100, 1900)}` : "",
    referencia: tipo === "delivery" && rnd() < 0.3 ? "Casa esquina, reja verde" : "",
    observaciones: uno(OBS),
  };
  const data = must(
    await colab.rpc("create_order", { p_order: order, p_items: itemsAlAzar(sucursal), p_forzar: forzar || !libres.length }),
    `pedido ${fecha} ${sucursal} ${h}`
  );
  const k = claveBloque(sucursal, fecha, h);
  ocupacion[k] = (ocupacion[k] ?? 0) + 1;
  // Hora de creación creíble: entre 30 minutos y 3 horas antes del horario.
  const creado = new Date(`${fecha}T${h.padStart(5, "0")}:00-03:00`);
  creado.setMinutes(creado.getMinutes() - entre(30, 180));
  const cambios = { created_at: (creado < new Date() ? creado : new Date()).toISOString() };
  if (cliente) Object.assign(cambios, { customer_id: cliente.id, cliente_email: cliente.email });
  must(await admin.from("orders").update(cambios).eq("id", data.id), "ajustar pedido");
  return data;
}

let pedidos = 0;
for (const fecha of pasados) {
  for (const b of branches) {
    const n = entre(dow(fecha) >= 5 ? 7 : 4, dow(fecha) >= 5 ? 11 : 7);
    for (let i = 0; i < n; i++, pedidos++) await crearPedido(fecha, b.name, { estado: "completado" });
  }
}
// Hoy: un bloque lleno (20:00 en Loncoche), uno con sobrecupo (21:00 en La Paz)
// y estados variados. Algunos con hora real (la estimada de un pedido online).
const ESTADOS_HOY = ["abierto", "abierto", "abierto", "en_proceso", "en_proceso", "listo"];
for (const b of branches) {
  const fijo = b.name === branches[0].name ? "20:" : "21:";
  const extra = b.name === branches[0].name ? 0 : 1;
  for (let i = 0; i < cupoDe[b.name] + extra; i++, pedidos++) {
    await crearPedido(hoy, b.name, { horario: `${fijo}${uno(["00", "05", "15", "20", "25"])}`, estado: uno(ESTADOS_HOY), forzar: i >= cupoDe[b.name] });
  }
  for (let i = entre(4, 6); i > 0; i--, pedidos++) await crearPedido(hoy, b.name, { estado: uno(ESTADOS_HOY) });
}
for (const b of branches) for (let i = entre(2, 3); i > 0; i--, pedidos++) await crearPedido(futuro, b.name, { estado: "abierto" });
console.log(`Pedidos: ${pedidos} (${pasados.length} días anteriores, hoy ${hoy} y ${futuro}). Susheros: ${fichas.length}.`);

// ── Inventario ────────────────────────────────────────────────────────────────
const red = (x) => Math.round(x * 10) / 10;
const items = must(
  await admin
    .from("inventory_items")
    .insert(INSUMOS.map(([nombre, unidad, critico], i) => ({ nombre, unidad, critico, sort_order: DEMO_SORT + i })))
    .select("id, nombre"),
  "crear insumos"
);
const idDe = Object.fromEntries(items.map((i) => [i.nombre, i.id]));
must(
  await admin.from("inventory_item_branches").insert(
    INSUMOS.flatMap(([nombre, , , minimo]) => branches.map((b) => ({ item_id: idDe[nombre], branch_id: b.id, stock_minimo: minimo })))
  ),
  "mínimos"
);

// Últimos 10 días abiertos: uso diario, mermas ocasionales y compras cuando el
// stock se acerca al mínimo. Los insumos marcados como "bajo" en una
// sucursal no se reponen los últimos 3 días, para que salgan en la alerta.
const diasInv = [...pasados.slice(-9), hoy];
const BAJOS = new Set(["Salmón|loncoche", "Palta|la_paz", "Panko|la_paz", "Queso crema|loncoche"]);
const movimientos = [];
for (const [nombre, , , minimo, diario] of INSUMOS) {
  for (const b of branches) {
    const bajo = BAJOS.has(`${nombre}|${b.id}`);
    let stock = red(minimo + diario * entre(4, 6));
    const movs = [{ fecha: diasInv[0], tipo: "ingreso", cantidad: stock, observacion: "Stock inicial" }];
    diasInv.forEach((fecha, d) => {
      const reponer = !(bajo && d >= diasInv.length - 4);
      if (d > 0 && reponer && stock < minimo * 1.3 + diario * 1.5) {
        const compra = red(minimo + diario * entre(3, 5));
        movs.push({ fecha, tipo: "ingreso", cantidad: compra, observacion: uno(["Proveedor", "Compra en supermercado", ""]) });
        stock += compra;
      }
      if (fecha === hoy) return; // hoy todavía no se usa nada
      const uso = red(Math.min(stock - 0.1, diario * (0.7 + rnd() * 0.6)));
      if (uso > 0) {
        movs.push({ fecha, tipo: "uso", cantidad: -uso, observacion: "" });
        stock -= uso;
      }
      const merma = red(Math.max(0.1, diario * 0.15));
      if (rnd() < 0.12 && stock - merma > 0.1) {
        movs.push({ fecha, tipo: "merma", cantidad: -merma, observacion: uno(["Vencido", "Se cayó", "Mal estado"]) });
        stock -= merma;
      }
    });
    // Un conteo con diferencia chica en algunos insumos.
    const dif = uno([-0.2, -0.1, 0.1]) * (diario >= 10 ? 10 : 1);
    if (rnd() < 0.3 && stock + dif > 0) movs.push({ fecha: hoy, tipo: "ajuste", cantidad: red(dif), observacion: "Conteo" });
    for (const m of movs) movimientos.push({ ...m, item_id: idDe[nombre], branch_id: b.id });
  }
}
// La mayoría los registra el colaborador; los ingresos, el administrador.
const porRol = (rol) => movimientos.filter((m) => (m.tipo === "ingreso") === (rol === "admin"));
must(await admin.from("inventory_movements").insert(porRol("admin")), "movimientos (admin)");
must(await colab.from("inventory_movements").insert(porRol("colab")), "movimientos (colaborador)");
console.log(`Inventario: ${items.length} insumos y ${movimientos.length} movimientos.`);

// ── Cierres de caja ───────────────────────────────────────────────────────────
let cierres = 0;
for (const fecha of pasados.slice(-4)) {
  for (const b of branches) {
    if (fecha === pasados.at(-1) && b.id === branches[1].id) continue; // uno sin cerrar
    const sistema = must(await colab.rpc("cash_summary", { p_branch_id: b.id, p_fecha: fecha }), "resumen de caja");
    const declarado = {
      fondo_inicial: 20000,
      tarjetas: (sistema?.ventas_por_metodo?.debito ?? 0) + uno([0, 0, 0, -2000]),
      transferencias: (sistema?.ventas_por_metodo?.transferencia ?? 0) + uno([0, 0, 0, -1500]),
      otros_egresos: rnd() < 0.5 ? [{ detalle: "Gas", monto: 12000 }] : [],
      observaciones: "[demo] Cierre de demostración",
    };
    // Con poco efectivo y muchos deliveries, el fondo debe alcanzar.
    const previo = calcularCuadratura(sistema, { ...declarado, efectivo_contado: 0 }).esperado;
    if (previo < 5000) declarado.fondo_inicial += Math.ceil((5000 - previo) / 10000) * 10000;
    const { esperado } = calcularCuadratura(sistema, { ...declarado, efectivo_contado: 0 });
    declarado.efectivo_contado = esperado + uno([0, 0, 0, -500, 1000]);
    must(await colab.rpc("save_cash_closing", { p_branch_id: b.id, p_fecha: fecha, p_declarado: declarado }), `cierre ${b.name} ${fecha}`);
    cierres++;
  }
}
console.log(`Caja: ${cierres} cierres. Hora en Chile: ${horaChile()}.`);
