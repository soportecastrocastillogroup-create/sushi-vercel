import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { AuthContext } from "./auth-context.js";

// Perfil del equipo (staff_profiles) y ficha de cliente (customers). Un usuario
// es personal si tiene perfil activo y es cliente si tiene ficha; RLS solo
// deja leer los propios.
async function fetchProfile(id) {
  const [staff, customer] = await Promise.all([
    supabase.from("staff_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("customers").select("*").eq("auth_user_id", id).maybeSingle(),
  ]);
  return { data: staff.error ? null : staff.data, customer: customer.error ? null : customer.data };
}

// Sesión de Supabase Auth, perfil del equipo y ficha de cliente.
// `session` es undefined mientras se lee la sesión guardada.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profileState, setProfileState] = useState({ userId: null, data: null, customer: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const loadProfile = useCallback(async (id) => {
    setProfileState({ userId: id, ...(await fetchProfile(id)) });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId).then((r) => {
      if (!cancelled) setProfileState({ userId, ...r });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo(() => {
    const current = userId && profileState.userId === userId;
    const profile = current ? profileState.data : null;
    const customer = current ? profileState.customer : null;
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading: session === undefined || (Boolean(userId) && profileState.userId !== userId),
      isAdmin: profile?.active && profile?.rol === "administrador",
      customer,
      refreshProfile: () => userId && loadProfile(userId),
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (!error) return null;
        if (/banned/i.test(error.message)) return "Tu cuenta está desactivada o bloqueada.";
        if (/invalid login credentials/i.test(error.message)) return "Correo o contraseña incorrectos.";
        return "No pudimos iniciar sesión. Intenta nuevamente.";
      },
      signOut: () => supabase.auth.signOut(),
    };
  }, [session, userId, profileState, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
