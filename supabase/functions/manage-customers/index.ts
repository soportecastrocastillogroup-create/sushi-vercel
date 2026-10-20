// PRD 02 · Etapa 5 (sección 5.5): gestión de cuentas de clientes (Susheros).
//
// Solo un administrador activo puede llamarla. Usa la clave service_role, que
// Supabase inyecta como variable de entorno y nunca llega al navegador.
//
// Acciones: reset_password, set_blocked, update_email.
// Sin SMTP: el administrador define la contraseña nueva y se la envía al
// cliente por WhatsApp.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BAN_FOREVER = "876000h"; // ~100 años: cuenta bloqueada
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireString(v: unknown, field: string, min = 1): string {
  if (typeof v !== "string" || v.trim().length < min) {
    throw new HttpError(400, `Campo inválido: ${field}`);
  }
  return v.trim();
}

function requirePassword(v: unknown): string {
  if (typeof v !== "string" || v.length < 8) {
    throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres.");
  }
  return v;
}

async function getCustomer(admin: SupabaseClient, id: string, needsAccount = true) {
  const { data, error } = await admin.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Cliente no encontrado.");
  if (needsAccount && !data.auth_user_id) throw new HttpError(400, "Este cliente no tiene cuenta en el sitio.");
  return data;
}

async function audit(admin: SupabaseClient, actorId: string, targetId: string | null, action: string, detail = {}) {
  await admin.from("staff_audit").insert({ actor_id: actorId, target_id: targetId, action, detail });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Identificar a quien llama con su propio token.
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) throw new HttpError(401, "Sesión inválida.");
    const actorId = userData.user.id;

    // 2. Verificar que sea administrador activo.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: actor } = await admin.from("staff_profiles").select("rol, active").eq("user_id", actorId).maybeSingle();
    if (!actor || !actor.active || actor.rol !== "administrador") {
      throw new HttpError(403, "Solo un administrador puede gestionar cuentas de clientes.");
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "reset_password": {
        const customer = await getCustomer(admin, requireString(body.customer_id, "customer_id"));
        const password = requirePassword(body.password);
        const { error } = await admin.auth.admin.updateUserById(customer.auth_user_id, { password });
        if (error) throw error;
        await audit(admin, actorId, customer.auth_user_id, "customer_reset_password", { email: customer.email });
        return json({ ok: true });
      }

      case "set_blocked": {
        const customer = await getCustomer(admin, requireString(body.customer_id, "customer_id"), false);
        const bloqueado = body.bloqueado === true;
        if (customer.auth_user_id) {
          const { error: bErr } = await admin.auth.admin.updateUserById(customer.auth_user_id, {
            ban_duration: bloqueado ? BAN_FOREVER : "none",
          });
          if (bErr) throw bErr;
        }
        const { error } = await admin
          .from("customers")
          .update({ bloqueado, updated_at: new Date().toISOString() })
          .eq("id", customer.id);
        if (error) throw error;
        await audit(admin, actorId, customer.auth_user_id, bloqueado ? "customer_block" : "customer_unblock", { email: customer.email });
        return json({ ok: true });
      }

      case "update_email": {
        const customer = await getCustomer(admin, requireString(body.customer_id, "customer_id"), false);
        const email = requireString(body.email, "email", 5).toLowerCase();
        if (!EMAIL_RE.test(email)) throw new HttpError(400, "Correo inválido.");
        const { data: taken } = await admin.from("customers").select("id").eq("email", email).neq("id", customer.id).maybeSingle();
        if (taken) throw new HttpError(400, "Ya existe otro cliente con ese correo.");
        if (customer.auth_user_id) {
          const { error: uErr } = await admin.auth.admin.updateUserById(customer.auth_user_id, { email, email_confirm: true });
          if (uErr) {
            const msg = /already|registered|exists/i.test(uErr.message) ? "Ya existe una cuenta con ese correo." : uErr.message;
            throw new HttpError(400, msg);
          }
        }
        const { error } = await admin
          .from("customers")
          .update({ email, updated_at: new Date().toISOString() })
          .eq("id", customer.id);
        if (error) throw error;
        await audit(admin, actorId, customer.auth_user_id, "customer_update_email", { from: customer.email, to: email });
        return json({ ok: true });
      }

      default:
        throw new HttpError(400, "Acción desconocida.");
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Error interno. Intenta nuevamente." }, 500);
  }
});
