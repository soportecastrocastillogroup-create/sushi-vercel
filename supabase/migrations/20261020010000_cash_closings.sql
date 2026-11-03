-- PRD 02 · Etapa 4: cuadratura de caja por sucursal y día.
--
-- 1. branches.pago_repartidor: lo que se le paga al repartidor por cada
--    delivery (distinto del cobro al cliente), editable en Locales.
-- 2. cash_summary(): lo que trae el sistema para un día y una sucursal.
-- 3. cash_closings y save_cash_closing(): el cierre guarda las cifras del
--    momento y el resultado. La tarifa del repartidor queda fija desde el
--    primer cierre, así un cambio posterior no altera cierres anteriores. El
--    cierre se puede editar después; las cifras de pedidos se recalculan.
--
-- Fórmula (también en src/utils/caja.js; hay pruebas que comparan ambas):
--   "Pago al retirar" no distingue tarjeta de efectivo, así que
--   ventas en efectivo = ventas "pago al retirar" − tarjetas declaradas.
--   egresos en efectivo = total repartidor + otros egresos.
--   efectivo esperado    = fondo + ventas en efectivo − egresos en efectivo.
--   diferencia efectivo  = efectivo contado − efectivo esperado.
--   diferencia transfer. = transferencias declaradas − ventas por transferencia.
--   diferencia total     = diferencia efectivo + diferencia transferencias.

-- ── 1. Pago al repartidor ───────────────────────────────────────────────────
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS pago_repartidor integer NOT NULL DEFAULT 2000;
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_pago_repartidor_check;
ALTER TABLE branches ADD CONSTRAINT branches_pago_repartidor_check CHECK (pago_repartidor >= 0);

-- ── 2. Tabla de cierres ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_closings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             text NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  fecha                 date NOT NULL,
  -- Lo que trae el sistema, del momento del cierre.
  pedidos               integer NOT NULL,
  pedidos_pendientes    integer NOT NULL,
  ventas_total          integer NOT NULL,
  ventas_por_metodo     jsonb NOT NULL DEFAULT '{}',
  deliveries            integer NOT NULL,
  tarifa_repartidor     integer NOT NULL,
  total_repartidor      integer NOT NULL,
  -- Lo que declara quien cierra.
  fondo_inicial         integer NOT NULL DEFAULT 0 CHECK (fondo_inicial >= 0),
  efectivo_contado      integer NOT NULL DEFAULT 0 CHECK (efectivo_contado >= 0),
  tarjetas              integer NOT NULL DEFAULT 0 CHECK (tarjetas >= 0),
  transferencias        integer NOT NULL DEFAULT 0 CHECK (transferencias >= 0),
  otros_egresos         jsonb NOT NULL DEFAULT '[]',
  observaciones         text NOT NULL DEFAULT '',
  -- Resultado.
  efectivo_esperado     integer NOT NULL,
  diferencia_efectivo   integer NOT NULL,
  diferencia_transferencias integer NOT NULL,
  diferencia_total      integer NOT NULL,
  -- Autoría.
  cerrado_por           uuid,
  cerrado_por_nombre    text NOT NULL DEFAULT '',
  cerrado_at            timestamptz NOT NULL DEFAULT now(),
  editado_por_nombre    text,
  updated_at            timestamptz,
  UNIQUE (branch_id, fecha)
);

ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_select_cash_closings ON cash_closings;
CREATE POLICY staff_select_cash_closings ON cash_closings
  FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS admin_delete_cash_closings ON cash_closings;
CREATE POLICY admin_delete_cash_closings ON cash_closings
  FOR DELETE TO authenticated USING (public.is_admin());
-- Sin INSERT ni UPDATE directos: se escribe solo con save_cash_closing().
REVOKE ALL ON cash_closings FROM anon;

-- ── 3. Lo que trae el sistema ───────────────────────────────────────────────
-- Tarifa: la del cierre si ya existe; si no, la vigente de la sucursal.
CREATE OR REPLACE FUNCTION public.cash_summary(p_branch_id text, p_fecha date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch   branches;
  v_tarifa   integer;
  v_result   jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_branch FROM branches WHERE id = p_branch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sucursal no válida: %', p_branch_id USING ERRCODE = '22023';
  END IF;
  v_tarifa := coalesce(
    (SELECT tarifa_repartidor FROM cash_closings WHERE branch_id = p_branch_id AND fecha = p_fecha),
    v_branch.pago_repartidor
  );

  SELECT jsonb_build_object(
    'pedidos', count(*),
    'pedidos_pendientes', count(*) FILTER (WHERE o.estado <> 'completado'),
    'ventas_total', coalesce(sum(o.total), 0),
    'ventas_por_metodo', coalesce(
      (SELECT jsonb_object_agg(metodo_pago, total)
         FROM (SELECT metodo_pago, sum(total) AS total FROM orders
                WHERE sucursal = v_branch.name AND fecha = p_fecha GROUP BY metodo_pago) t),
      '{}'::jsonb),
    'deliveries', count(*) FILTER (WHERE o.tipo = 'delivery'),
    'tarifa_repartidor', v_tarifa,
    'total_repartidor', count(*) FILTER (WHERE o.tipo = 'delivery') * v_tarifa
  )
  INTO v_result
  FROM orders o
  WHERE o.sucursal = v_branch.name AND o.fecha = p_fecha;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_summary(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cash_summary(text, date) TO authenticated;

-- ── 4. Guardar (crear o editar) un cierre ───────────────────────────────────
-- p_declarado: { fondo_inicial, efectivo_contado, tarjetas, transferencias,
--                otros_egresos: [{ detalle, monto }], observaciones }
CREATE OR REPLACE FUNCTION public.save_cash_closing(p_branch_id text, p_fecha date, p_declarado jsonb)
RETURNS cash_closings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sys        jsonb;
  v_nombre     text;
  v_fondo      integer := coalesce((p_declarado->>'fondo_inicial')::integer, 0);
  v_contado    integer := coalesce((p_declarado->>'efectivo_contado')::integer, 0);
  v_tarjetas   integer := coalesce((p_declarado->>'tarjetas')::integer, 0);
  v_transf     integer := coalesce((p_declarado->>'transferencias')::integer, 0);
  v_otros      jsonb;
  v_otros_sum  integer;
  v_retiro     integer;
  v_trans_sis  integer;
  v_esperado   integer;
  v_dif_ef     integer;
  v_dif_tr     integer;
  v_row        cash_closings;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF least(v_fondo, v_contado, v_tarjetas, v_transf) < 0 THEN
    RAISE EXCEPTION 'Los montos no pueden ser negativos' USING ERRCODE = '22023';
  END IF;

  -- Otros egresos: solo los que tienen monto > 0, con detalle limpio.
  SELECT coalesce(jsonb_agg(jsonb_build_object('detalle', btrim(coalesce(e->>'detalle', '')), 'monto', (e->>'monto')::integer)), '[]'::jsonb),
         coalesce(sum((e->>'monto')::integer), 0)
    INTO v_otros, v_otros_sum
    FROM jsonb_array_elements(coalesce(p_declarado->'otros_egresos', '[]'::jsonb)) e
   WHERE coalesce((e->>'monto')::integer, 0) > 0;

  -- Bloquea el cierre de ese día mientras se calcula.
  PERFORM pg_advisory_xact_lock(hashtext('caja|' || p_branch_id || '|' || p_fecha::text));
  v_sys := public.cash_summary(p_branch_id, p_fecha);

  v_retiro    := coalesce((v_sys->'ventas_por_metodo'->>'pago_contra_entrega')::integer, 0);
  v_trans_sis := coalesce((v_sys->'ventas_por_metodo'->>'transferencia')::integer, 0);
  v_esperado  := v_fondo + (v_retiro - v_tarjetas) - ((v_sys->>'total_repartidor')::integer + v_otros_sum);
  v_dif_ef    := v_contado - v_esperado;
  v_dif_tr    := v_transf - v_trans_sis;
  v_nombre    := coalesce((SELECT nombre FROM staff_profiles WHERE user_id = auth.uid()), '');

  INSERT INTO cash_closings AS c (
    branch_id, fecha, pedidos, pedidos_pendientes, ventas_total, ventas_por_metodo,
    deliveries, tarifa_repartidor, total_repartidor,
    fondo_inicial, efectivo_contado, tarjetas, transferencias, otros_egresos, observaciones,
    efectivo_esperado, diferencia_efectivo, diferencia_transferencias, diferencia_total,
    cerrado_por, cerrado_por_nombre
  ) VALUES (
    p_branch_id, p_fecha,
    (v_sys->>'pedidos')::integer, (v_sys->>'pedidos_pendientes')::integer,
    (v_sys->>'ventas_total')::integer, v_sys->'ventas_por_metodo',
    (v_sys->>'deliveries')::integer, (v_sys->>'tarifa_repartidor')::integer, (v_sys->>'total_repartidor')::integer,
    v_fondo, v_contado, v_tarjetas, v_transf, v_otros, coalesce(btrim(p_declarado->>'observaciones'), ''),
    v_esperado, v_dif_ef, v_dif_tr, v_dif_ef + v_dif_tr,
    auth.uid(), v_nombre
  )
  ON CONFLICT (branch_id, fecha) DO UPDATE SET
    pedidos = EXCLUDED.pedidos,
    pedidos_pendientes = EXCLUDED.pedidos_pendientes,
    ventas_total = EXCLUDED.ventas_total,
    ventas_por_metodo = EXCLUDED.ventas_por_metodo,
    deliveries = EXCLUDED.deliveries,
    total_repartidor = EXCLUDED.total_repartidor,
    fondo_inicial = EXCLUDED.fondo_inicial,
    efectivo_contado = EXCLUDED.efectivo_contado,
    tarjetas = EXCLUDED.tarjetas,
    transferencias = EXCLUDED.transferencias,
    otros_egresos = EXCLUDED.otros_egresos,
    observaciones = EXCLUDED.observaciones,
    efectivo_esperado = EXCLUDED.efectivo_esperado,
    diferencia_efectivo = EXCLUDED.diferencia_efectivo,
    diferencia_transferencias = EXCLUDED.diferencia_transferencias,
    diferencia_total = EXCLUDED.diferencia_total,
    editado_por_nombre = v_nombre,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_cash_closing(text, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_cash_closing(text, date, jsonb) TO authenticated;
