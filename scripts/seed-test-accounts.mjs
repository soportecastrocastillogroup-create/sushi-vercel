/**
 * Crea o restablece las cuentas de prueba en Pedidos Desarrollo (personal y
 * clientes), con contraseñas aleatorias nuevas en cada ejecución. Los
 * clientes se crean con tipo = 'cliente', así el trigger les crea su ficha.
 *
 * Las contraseñas no se imprimen: se guardan en credenciales-prueba.local
 * (ignorado por Git). Ábrelo en tu editor para verlas.
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY="$(npx supabase projects api-keys --project-ref ikzprpnpyvbwsxiqprdt -o json \
 *     | node -pe 'JSON.parse(require("fs").readFileSync(0)).find(k=>k.name==="service_role").api_key')" \
 *     node scripts/seed-test-accounts.mjs
 */
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const DEV_REF = "ikzprpnpyvbwsxiqprdt";
const URL = `https://${DEV_REF}.supabase.co`;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACCOUNTS = [
  { email: "agente.pruebas@example.com", nombre: "Agente Pruebas", rol: "administrador" },
  { email: "colab.pruebas@example.com", nombre: "Colaborador Pruebas", rol: "colaborador" },
  { email: "cliente.pruebas@example.com", nombre: "Cliente Pruebas", rol: "cliente", telefono: "+56900000001" },
  { email: "cliente2.pruebas@example.com", nombre: "Cliente Dos Pruebas", rol: "cliente2", telefono: "+56900000002" },
];
const isCliente = (acc) => acc.rol.startsWith("cliente");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "credenciales-prueba.local");

if (!KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY (de Pedidos Desarrollo).");
  process.exit(1);
}
// La clave service_role es un JWT con el ref del proyecto: nunca correr contra producción.
const payload = JSON.parse(Buffer.from(KEY.split(".")[1] || "", "base64url").toString() || "{}");
if (payload.ref !== DEV_REF || payload.role !== "service_role") {
  console.error("La clave no es la service_role de Pedidos Desarrollo. No se hace nada.");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function api(path, options = {}) {
  const res = await fetch(`${URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path}: ${res.status} ${body}`);
  return body ? JSON.parse(body) : null;
}

async function findUser(email) {
  for (let page = 1; ; page++) {
    const { users } = await api(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const user = users.find((u) => u.email === email);
    if (user || users.length < 200) return user;
  }
}

const lines = [
  "# Cuentas de prueba de Pedidos Desarrollo. No commitear ni compartir.",
  `# Generado: ${new Date().toISOString()}`,
  "",
];

for (const acc of ACCOUNTS) {
  const password = randomBytes(12).toString("base64url");
  let user = await findUser(acc.email);
  if (user) {
    await api(`/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ password, ban_duration: "none" }),
    });
  } else {
    user = await api("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: acc.email,
        password,
        email_confirm: true,
        user_metadata: isCliente(acc) ? { tipo: "cliente", nombre: acc.nombre, telefono: acc.telefono } : { nombre: acc.nombre },
      }),
    });
  }
  if (isCliente(acc)) {
    // Ficha de cliente desbloqueada (el trigger la crea al registrarse).
    await api(`/rest/v1/customers?auth_user_id=eq.${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ bloqueado: false }),
    });
    lines.push(`${acc.rol}: ${acc.email} / ${password}`);
    console.log(`OK ${acc.rol}: ${acc.email}`);
    continue;
  }
  await api("/rest/v1/staff_profiles?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: user.id,
      email: acc.email,
      nombre: acc.nombre,
      rol: acc.rol,
      active: true,
      must_change_password: false,
    }),
  });
  lines.push(`${acc.rol}: ${acc.email} / ${password}`);
  console.log(`OK ${acc.rol}: ${acc.email}`);
}

writeFileSync(outFile, lines.join("\n") + "\n", { mode: 0o600 });
console.log(`Contraseñas guardadas en ${outFile}`);
