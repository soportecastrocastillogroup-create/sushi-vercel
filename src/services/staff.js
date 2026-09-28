import { supabase } from "../lib/supabase.js";

// Llama a la Edge Function `manage-staff` (solo administradores).
async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("manage-staff", { body: { action, ...payload } });
  if (error) {
    let message = "No pudimos completar la acción.";
    try {
      const body = await error.context?.json();
      if (body?.error) message = body.error;
    } catch {
      // respuesta sin JSON
    }
    throw new Error(message);
  }
  return data;
}

export const listStaff = () => call("list").then((d) => d.staff);
export const createStaff = (p) => call("create", p);
export const updateStaff = (p) => call("update", p);
export const setStaffActive = (user_id, active) => call("set_active", { user_id, active });
export const resetStaffPassword = (user_id, password) => call("reset_password", { user_id, password });

export async function changeOwnPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message)) throw new Error("La nueva contraseña debe ser distinta de la actual.");
    throw new Error("No pudimos cambiar la contraseña. Intenta nuevamente.");
  }
  const { error: rErr } = await supabase.rpc("mark_password_changed");
  if (rErr) throw new Error("La contraseña cambió, pero no pudimos actualizar tu perfil.");
}

// Contraseña legible (sin caracteres ambiguos).
export function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
