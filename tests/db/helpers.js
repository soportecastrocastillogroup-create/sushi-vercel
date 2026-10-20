// Conexión de las pruebas de integración a Pedidos Desarrollo.
// Requiere .env.local (Pedidos Desarrollo) y credenciales-prueba.local
// (scripts/seed-test-accounts.mjs). Se niega a correr contra otro proyecto.
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

export const anonClient = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export async function login(rol) {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword(creds[rol]);
  if (error) throw new Error(`No se pudo entrar como ${rol}: ${error.message}`);
  return c;
}

// Llama a una Edge Function con la sesión de `client`.
export async function callFunction(client, name, body) {
  const { data } = await client.auth.getSession();
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export const credentials = (rol) => creds[rol];

// Fecha "YYYY-MM-DD" en Chile, desplazada `dias` desde hoy.
export function isoChile(dias = 0) {
  const d = new Date(Date.now() + dias * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d);
}
