-- PRD 02 · Etapa 3: inventario de insumos por sucursal.
--
-- Insumos del local (arroz, salmón, palta…), sin relación con la carta. El
-- stock no se guarda: es la suma de los movimientos, así siempre cuadra con
-- el historial. Todo el personal registra, edita y borra movimientos; cada
-- uno guarda quién lo creó y quién lo editó (lo completa un trigger, no el
-- navegador). Solo el administrador configura insumos y mínimos.
--
-- Semáforo: rojo si el stock es ≤ 0 o está bajo el mínimo; amarillo si está
-- sobre el mínimo pero a menos de un 25 % de él; verde en otro caso.

-- ── Tablas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL CHECK (btrim(nombre) <> ''),
  unidad      text NOT NULL DEFAULT 'kg' CHECK (btrim(unidad) <> ''),
  critico     boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_nombre_key ON inventory_items (lower(btrim(nombre)));

-- En qué sucursal se usa cada insumo y su mínimo allí.
CREATE TABLE IF NOT EXISTS inventory_item_branches (
  item_id      uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  branch_id    text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  stock_minimo numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  PRIMARY KEY (item_id, branch_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: un insumo con historial se desactiva, no se borra.
  item_id           uuid NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  branch_id         text NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  tipo              text NOT NULL CHECK (tipo IN ('ingreso', 'uso', 'merma', 'ajuste')),
  cantidad          numeric(12,3) NOT NULL,
  fecha             date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Santiago')::date,
  observacion       text NOT NULL DEFAULT '',
  created_by        uuid,
  created_by_nombre text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,
  updated_by_nombre text,
  updated_at        timestamptz,
  -- Con signo: positiva en ingreso, negativa en uso y merma, distinta de cero en ajuste.
  CONSTRAINT inventory_movements_signo CHECK (
    (tipo = 'ingreso' AND cantidad > 0)
    OR (tipo IN ('uso', 'merma') AND cantidad < 0)
    OR (tipo = 'ajuste' AND cantidad <> 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_fecha ON inventory_movements (branch_id, fecha);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements (item_id);

-- ── Autoría de los movimientos ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inventory_movements_autoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre text := coalesce((SELECT nombre FROM staff_profiles WHERE user_id = auth.uid()), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.created_by_nombre := v_nombre;
    NEW.created_at := now();
    NEW.updated_by := NULL;
    NEW.updated_by_nombre := NULL;
    NEW.updated_at := NULL;
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_by_nombre := OLD.created_by_nombre;
    NEW.created_at := OLD.created_at;
    NEW.updated_by := auth.uid();
    NEW.updated_by_nombre := v_nombre;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_autoria ON inventory_movements;
CREATE TRIGGER inventory_movements_autoria
  BEFORE INSERT OR UPDATE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.inventory_movements_autoria();

-- ── Semáforo, stock y planilla del día ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inventory_semaforo(p_stock numeric, p_minimo numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_stock <= 0 OR p_stock < p_minimo THEN 'rojo'
    WHEN p_stock < p_minimo * 1.25 THEN 'amarillo'
    ELSE 'verde'
  END
$$;

-- Stock actual por insumo y sucursal (respeta RLS de quien consulta).
CREATE OR REPLACE VIEW public.inventory_stock
WITH (security_invoker = true) AS
SELECT
  i.id AS item_id,
  i.nombre,
  i.unidad,
  i.critico,
  i.sort_order,
  ib.branch_id,
  b.name AS sucursal,
  ib.stock_minimo,
  coalesce(m.stock, 0) AS stock,
  public.inventory_semaforo(coalesce(m.stock, 0), ib.stock_minimo) AS semaforo
FROM inventory_items i
JOIN inventory_item_branches ib ON ib.item_id = i.id
JOIN branches b ON b.id = ib.branch_id
LEFT JOIN LATERAL (
  SELECT sum(cantidad) AS stock
  FROM inventory_movements mv
  WHERE mv.item_id = i.id AND mv.branch_id = ib.branch_id
) m ON true
WHERE i.active;

-- Planilla de un día en una sucursal: stock al inicio, lo que entró, se usó,
-- se mermó o se ajustó ese día, y el stock al cierre del día.
CREATE OR REPLACE FUNCTION public.inventory_daily(p_branch_id text, p_fecha date)
RETURNS TABLE (
  item_id uuid,
  nombre text,
  unidad text,
  critico boolean,
  sort_order integer,
  stock_minimo numeric,
  inicio numeric,
  ingresos numeric,
  usos numeric,
  mermas numeric,
  ajustes numeric,
  actual numeric,
  semaforo text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    i.id,
    i.nombre,
    i.unidad,
    i.critico,
    i.sort_order,
    ib.stock_minimo,
    coalesce(sum(mv.cantidad) FILTER (WHERE mv.fecha < p_fecha), 0),
    coalesce(sum(mv.cantidad) FILTER (WHERE mv.fecha = p_fecha AND mv.tipo = 'ingreso'), 0),
    coalesce(-sum(mv.cantidad) FILTER (WHERE mv.fecha = p_fecha AND mv.tipo = 'uso'), 0),
    coalesce(-sum(mv.cantidad) FILTER (WHERE mv.fecha = p_fecha AND mv.tipo = 'merma'), 0),
    coalesce(sum(mv.cantidad) FILTER (WHERE mv.fecha = p_fecha AND mv.tipo = 'ajuste'), 0),
    coalesce(sum(mv.cantidad) FILTER (WHERE mv.fecha <= p_fecha), 0),
    public.inventory_semaforo(coalesce(sum(mv.cantidad) FILTER (WHERE mv.fecha <= p_fecha), 0), ib.stock_minimo)
  FROM inventory_items i
  JOIN inventory_item_branches ib ON ib.item_id = i.id AND ib.branch_id = p_branch_id
  LEFT JOIN inventory_movements mv ON mv.item_id = i.id AND mv.branch_id = p_branch_id
  WHERE i.active
  GROUP BY i.id, ib.stock_minimo
  ORDER BY i.sort_order, i.nombre
$$;

REVOKE ALL ON FUNCTION public.inventory_daily(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_daily(text, date) TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Configuración: el personal la lee y el administrador la escribe.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['inventory_items','inventory_item_branches']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_select_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY staff_select_%s ON %I FOR SELECT TO authenticated USING (public.is_staff())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS admin_write_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY admin_write_%s ON %I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- Movimientos: todo el personal.
DROP POLICY IF EXISTS staff_all_inventory_movements ON inventory_movements;
CREATE POLICY staff_all_inventory_movements ON inventory_movements
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

REVOKE ALL ON inventory_items, inventory_item_branches, inventory_movements, inventory_stock FROM anon;
