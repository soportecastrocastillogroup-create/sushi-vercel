// PRD 01 · Etapa B (sección 5.1.0.1): gestión de cuentas del equipo.
//
// Solo un administrador activo puede llamarla. Usa la clave service_role, que
// Supabase inyecta como variable de entorno y nunca llega al navegador.
//
// Acciones: list, create, update, set_active, reset_password.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["administrador", "colaborador"] as const;
const BAN_FOREVER = "876000h"; // ~100 años: cuenta desactivada

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

function requireRole(v: unknown): string {
  if (!ROLES.includes(v as (typeof ROLES)[number])) throw new HttpError(400, "Rol inválido.");
  return v as string;
}

async function activeAdminCount(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("staff_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("rol", "administrador")
    .eq("active", true);
  if (error) throw error;
  return count ?? 0;
}

async function getProfile(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.from("staff_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Cuenta no encontrada.");
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
      throw new HttpError(403, "Solo un administrador puede gestionar cuentas.");
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "list": {
        const { data: profiles, error } = await admin.from("staff_profiles").select("*").order("created_at");
        if (error) throw error;
        const { data: users, error: uErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (uErr) throw uErr;
        const lastSignIn = new Map(users.users.map((u) => [u.id, u.last_sign_in_at]));
        return json({
          staff: profiles.map((p) => ({ ...p, last_sign_in_at: lastSignIn.get(p.user_id) ?? null })),
        });
      }

      case "create": {
        const nombre = requireString(body.nombre, "nombre", 2);
        const email = requireString(body.email, "email", 5).toLowerCase();
        const rol = requireRole(body.rol);
        const password = requirePassword(body.password);

        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre },
        });
        if (error) {
          const msg = /already|registered|exists/i.test(error.message)
            ? "Ya existe una cuenta con ese correo."
            : error.message;
          throw new HttpError(400, msg);
        }
        const userId = created.user.id;
        const { error: pErr } = await admin
          .from("staff_profiles")
          .insert({ user_id: userId, nombre, email, rol, must_change_password: false });
        if (pErr) {
          await admin.auth.admin.deleteUser(userId); // no dejar usuarios sin perfil
          throw pErr;
        }
        await audit(admin, actorId, userId, "create", { email, rol });
        return json({ ok: true, user_id: userId });
      }

      case "update": {
        const userId = requireString(body.user_id, "user_id");
        const current = await getProfile(admin, userId);
        const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.nombre !== undefined) changes.nombre = requireString(body.nombre, "nombre", 2);
        if (body.rol !== undefined) {
          const rol = requireRole(body.rol);
          if (current.rol === "administrador" && rol !== "administrador" && current.active) {
            if ((await activeAdminCount(admin)) <= 1) {
              throw new HttpError(400, "Debe quedar al menos un administrador activo.");
            }
          }
          changes.rol = rol;
        }
        const { error } = await admin.from("staff_profiles").update(changes).eq("user_id", userId);
        if (error) throw error;
        await audit(admin, actorId, userId, "update", { nombre: changes.nombre, rol: changes.rol });
        return json({ ok: true });
      }

      case "set_active": {
        const userId = requireString(body.user_id, "user_id");
        const active = body.active === true;
        const current = await getProfile(admin, userId);
        if (!active) {
          if (userId === actorId) throw new HttpError(400, "No puedes desactivar tu propia cuenta.");
          if (current.rol === "administrador" && current.active && (await activeAdminCount(admin)) <= 1) {
            throw new HttpError(400, "Debe quedar al menos un administrador activo.");
          }
        }
        const { error: bErr } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: active ? "none" : BAN_FOREVER,
        });
        if (bErr) throw bErr;
        const { error } = await admin
          .from("staff_profiles")
          .update({ active, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) throw error;
        await audit(admin, actorId, userId, active ? "activate" : "deactivate");
        return json({ ok: true });
      }

      case "reset_password": {
        const userId = requireString(body.user_id, "user_id");
        const password = requirePassword(body.password);
        await getProfile(admin, userId);
        const { error: pErr } = await admin.auth.admin.updateUserById(userId, { password });
        if (pErr) throw pErr;
        const { error } = await admin
          .from("staff_profiles")
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) throw error;
        await audit(admin, actorId, userId, "reset_password");
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
