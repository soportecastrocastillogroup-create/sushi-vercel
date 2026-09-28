-- PRD 01 · Etapa B: cuentas del equipo con Supabase Auth y roles.
--
-- Agrega perfiles con rol (administrador o colaborador), un registro de
-- acciones sobre cuentas y permisos para usuarios autenticados.
--
-- No cambia las políticas existentes para `anon`; el cierre del acceso público
-- a pedidos corresponde a la Etapa C. Las cuentas solo se crean o modifican
-- desde la Edge Function `manage-staff` (service_role), nunca desde el navegador.

-- ── Perfiles del equipo ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre               text NOT NULL,
  email                text NOT NULL,
  rol                  text NOT NULL CHECK (rol IN ('administrador', 'colaborador')),
  active               boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_audit (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id  uuid,
  action     text NOT NULL,
  detail     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Funciones de rol (usadas por las políticas RLS) ──────────────────────────
CREATE OR REPLACE FUNCTION public.staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM staff_profiles WHERE user_id = auth.uid() AND active;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.staff_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.staff_role() = 'administrador', false);
$$;

-- El propio usuario marca que ya cambió su contraseña temporal.
CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE staff_profiles
     SET must_change_password = false, updated_at = now()
   WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.staff_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_password_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;

-- ── RLS de las tablas nuevas ─────────────────────────────────────────────────
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON staff_profiles FROM anon;
REVOKE ALL ON staff_audit FROM anon;

DROP POLICY IF EXISTS staff_profiles_select ON staff_profiles;
CREATE POLICY staff_profiles_select ON staff_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS staff_audit_select ON staff_audit;
CREATE POLICY staff_audit_select ON staff_audit
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Sin políticas de escritura: se escribe solo con service_role (Edge Function).

-- ── Acceso de usuarios autenticados a las tablas existentes ─────────────────
-- Catálogo y configuración: lectura (el sitio público también se ve con sesión).
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['branches','categories','products','product_branches','promo_rolls','promo_options','customization_options','app_settings','time_slots','blocked_weekdays']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_select_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY auth_select_%s ON %I FOR SELECT TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Operación diaria: administradores y colaboradores activos (matriz 5.1.0).
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['product_stock','unlocked_dates','orders','order_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_all_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY staff_all_%s ON %I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', t, t);
  END LOOP;
END $$;

GRANT USAGE ON SEQUENCE order_number_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_order_number() TO authenticated;
