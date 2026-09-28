import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { AuthContext } from "./auth-context.js";

const fetchProfile = (id) => supabase.from("staff_profiles").select("*").eq("user_id", id).maybeSingle();

// Sesión de Supabase Auth y perfil del equipo (staff_profiles).
// `session` es undefined mientras se lee la sesión guardada.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profileState, setProfileState] = useState({ userId: null, data: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const loadProfile = useCallback(async (id) => {
    const { data, error } = await fetchProfile(id);
    setProfileState({ userId: id, data: error ? null : data });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId).then(({ data, error }) => {
      if (!cancelled) setProfileState({ userId, data: error ? null : data });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo(() => {
    const profile = userId && profileState.userId === userId ? profileState.data : null;
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading: session === undefined || (Boolean(userId) && profileState.userId !== userId),
      isAdmin: profile?.active && profile?.rol === "administrador",
      refreshProfile: () => userId && loadProfile(userId),
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (!error) return null;
        if (/banned/i.test(error.message)) return "Tu cuenta está desactivada. Habla con un administrador.";
        if (/invalid login credentials/i.test(error.message)) return "Correo o contraseña incorrectos.";
        return "No pudimos iniciar sesión. Intenta nuevamente.";
      },
      signOut: () => supabase.auth.signOut(),
    };
  }, [session, userId, profileState, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
