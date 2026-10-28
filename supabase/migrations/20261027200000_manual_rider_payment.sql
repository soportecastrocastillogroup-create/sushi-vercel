-- Caja: el pago al repartidor se puede anotar a mano al cerrar (pedido de
-- Bruno Veinz, 27 oct 2026). Si no se envía, sigue siendo deliveries × tarifa.
-- Se guarda en cash_closings.total_repartidor.

-- p_declarado: { fondo_inicial, efectivo_contado, tarjetas, transferencias,
--                pago_repartidor, otros_egresos: [{ detalle, monto }], observaciones }
-- pago_repartidor es opcional: si no viene, se usa deliveries × tarifa.
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
  v_repartidor integer;
  v_otros      jsonb;
  v_otros_sum  integer;
  v_ef_sis     integer;
  v_deb_sis    integer;
  v_trans_sis  integer;
  v_esperado   integer;
  v_dif_ef     integer;
  v_dif_tr     integer;
  v_dif_tj     integer;
  v_row        cash_closings;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF least(v_fondo, v_contado, v_tarjetas, v_transf, coalesce((p_declarado->>'pago_repartidor')::integer, 0)) < 0 THEN
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
  v_repartidor := coalesce((p_declarado->>'pago_repartidor')::integer, (v_sys->>'total_repartidor')::integer);

  -- Misma fórmula que utils/caja.js. "pago_contra_entrega" (pedidos
  -- anteriores a efectivo/débito) cuenta como efectivo.
  v_ef_sis    := coalesce((v_sys->'ventas_por_metodo'->>'efectivo')::integer, 0)
               + coalesce((v_sys->'ventas_por_metodo'->>'pago_contra_entrega')::integer, 0);
  v_deb_sis   := coalesce((v_sys->'ventas_por_metodo'->>'debito')::integer, 0);
  v_trans_sis := coalesce((v_sys->'ventas_por_metodo'->>'transferencia')::integer, 0);
  v_esperado  := v_fondo + v_ef_sis - (v_repartidor + v_otros_sum);
  v_dif_ef    := v_contado - v_esperado;
  v_dif_tr    := v_transf - v_trans_sis;
  v_dif_tj    := v_tarjetas - v_deb_sis;
  v_nombre    := coalesce((SELECT nombre FROM staff_profiles WHERE user_id = auth.uid()), '');

  INSERT INTO cash_closings AS c (
    branch_id, fecha, pedidos, pedidos_pendientes, ventas_total, ventas_por_metodo,
    deliveries, tarifa_repartidor, total_repartidor,
    fondo_inicial, efectivo_contado, tarjetas, transferencias, otros_egresos, observaciones,
    efectivo_esperado, diferencia_efectivo, diferencia_transferencias, diferencia_tarjetas, diferencia_total,
    cerrado_por, cerrado_por_nombre
  ) VALUES (
    p_branch_id, p_fecha,
    (v_sys->>'pedidos')::integer, (v_sys->>'pedidos_pendientes')::integer,
    (v_sys->>'ventas_total')::integer, v_sys->'ventas_por_metodo',
    (v_sys->>'deliveries')::integer, (v_sys->>'tarifa_repartidor')::integer, v_repartidor,
    v_fondo, v_contado, v_tarjetas, v_transf, v_otros, coalesce(btrim(p_declarado->>'observaciones'), ''),
    v_esperado, v_dif_ef, v_dif_tr, v_dif_tj, v_dif_ef + v_dif_tr + v_dif_tj,
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
    diferencia_tarjetas = EXCLUDED.diferencia_tarjetas,
    diferencia_total = EXCLUDED.diferencia_total,
    editado_por_nombre = v_nombre,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_cash_closing(text, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_cash_closing(text, date, jsonb) TO authenticated;
