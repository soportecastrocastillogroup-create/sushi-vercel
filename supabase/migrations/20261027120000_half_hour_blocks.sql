-- Reunión del 26 oct 2026 (PRD 02): bloques de 30 minutos configurables, hora
-- aproximada del pedido online y pagos en efectivo, débito o transferencia.
--
-- 1. app_settings.bloque_minutos (30 o 60) y minutos_preparacion (20).
-- 2. branches.cupo_por_hora pasa a cupo_por_bloque. Para no cambiar la
--    capacidad actual, el cupo se divide por 2 (4 por hora → 2 por bloque).
-- 3. bloque_inicio() reemplaza a hora_bloque(); minutos(), hhmm() y
--    hora_estimada_min() son auxiliares.
-- 4. available_blocks() reemplaza a available_slots(): bloques del día con su
--    cupo y la hora que tendría el pedido (hoy: la estimada si cae en el
--    bloque; si no, el inicio del bloque). Hoy solo se listan los bloques que
--    no han pasado.
-- 5. create_order: cupo por bloque; el cliente elige un bloque y la base pone
--    la hora; pagos efectivo, debito o transferencia (también en delivery).
-- 6. Caja: se separan efectivo y débito. "pago_contra_entrega" (pedidos
--    anteriores) cuenta como efectivo. Nueva diferencia de tarjetas:
--    declarado en tarjetas − débito del sistema.

-- ── 1. Configuración ─────────────────────────────────────────────────────────
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS bloque_minutos integer NOT NULL DEFAULT 30 CHECK (bloque_minutos IN (30, 60)),
  ADD COLUMN IF NOT EXISTS minutos_preparacion integer NOT NULL DEFAULT 20 CHECK (minutos_preparacion BETWEEN 5 AND 120);

-- ── 2. Cupo por bloque ───────────────────────────────────────────────────────
ALTER TABLE branches RENAME COLUMN cupo_por_hora TO cupo_por_bloque;
UPDATE branches SET cupo_por_bloque = greatest(1, ceil(cupo_por_bloque / 2.0)::integer);

-- ── 3. Auxiliares ────────────────────────────────────────────────────────────
-- "18:35" → 1115
CREATE OR REPLACE FUNCTION public.minutos(p_horario text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT split_part(p_horario, ':', 1)::integer * 60 + split_part(p_horario, ':', 2)::integer $$;

-- 1115 → "18:35"
CREATE OR REPLACE FUNCTION public.hhmm(p_minutos integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT lpad((p_minutos / 60)::text, 2, '0') || ':' || lpad((p_minutos % 60)::text, 2, '0') $$;

CREATE OR REPLACE FUNCTION public.bloque_minutos()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT coalesce((SELECT bloque_minutos FROM app_settings LIMIT 1), 30) $$;

-- Inicio del bloque de un horario: con bloques de 30, "18:47" → "18:30".
CREATE OR REPLACE FUNCTION public.bloque_inicio(p_horario text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT public.hhmm(public.minutos(p_horario) / public.bloque_minutos() * public.bloque_minutos()) $$;

-- Hora estimada de un pedido hecho ahora, en minutos desde la medianoche de
-- hoy en Chile: ahora + preparación, redondeado hacia arriba a 5 minutos.
-- Pasada la medianoche sigue contando (no vuelve a 0).
CREATE OR REPLACE FUNCTION public.hora_estimada_min()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (ceil((extract(epoch FROM (n - date_trunc('day', n))) / 60
                + coalesce((SELECT minutos_preparacion FROM app_settings LIMIT 1), 20)) / 5) * 5)::integer
  FROM (SELECT now() AT TIME ZONE 'America/Santiago' AS n) x
$$;

-- ── 4. Bloques disponibles ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.available_slots(text, date);

CREATE OR REPLACE FUNCTION public.available_blocks(p_sucursal text, p_fecha date)
RETURNS TABLE (bloque text, fin text, horario text, pedidos integer, cupo integer, disponible boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT public.bloque_minutos() AS b,
           (SELECT max(public.minutos(slot)) FROM time_slots) AS cierre,
           CASE WHEN p_fecha = (now() AT TIME ZONE 'America/Santiago')::date THEN public.hora_estimada_min() END AS est
  ),
  bloques AS (SELECT DISTINCT public.minutos(public.bloque_inicio(slot)) AS ini FROM time_slots),
  ocupados AS (
    SELECT public.bloque_inicio(o.horario) AS bl, count(*)::integer AS n
    FROM orders o WHERE o.sucursal = p_sucursal AND o.fecha = p_fecha
    GROUP BY 1
  )
  SELECT public.hhmm(bl.ini),
         -- El último bloque termina al cierre; si empieza al cierre, no tiene fin.
         CASE WHEN least(bl.ini + cfg.b, cfg.cierre) > bl.ini THEN public.hhmm(least(bl.ini + cfg.b, cfg.cierre)) END,
         public.hhmm(greatest(bl.ini, coalesce(cfg.est, bl.ini))),
         coalesce(oc.n, 0),
         br.cupo_por_bloque,
         coalesce(oc.n, 0) < br.cupo_por_bloque
  FROM bloques bl
  CROSS JOIN cfg
  JOIN branches br ON br.name = p_sucursal
  LEFT JOIN ocupados oc ON oc.bl = public.hhmm(bl.ini)
  WHERE cfg.est IS NULL OR (cfg.est < bl.ini + cfg.b AND cfg.est <= cfg.cierre)
  ORDER BY bl.ini
$$;

REVOKE ALL ON FUNCTION public.available_blocks(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_blocks(text, date) TO authenticated;

-- ── 5. create_order ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_order(p_order jsonb, p_items jsonb, p_forzar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Máximo de pedidos sin completar por cuenta de cliente.
  c_max_abiertos constant integer := 3;
  v_staff     boolean := public.is_staff();
  v_customer  customers;
  v_sucursal  text := p_order->>'sucursal';
  v_tipo      text := p_order->>'tipo';
  v_fecha     date := (p_order->>'fecha')::date;
  v_horario   text := p_order->>'horario';
  v_metodo    text := coalesce(nullif(p_order->>'metodoPago', ''), 'transferencia');
  v_nombre    text := btrim(coalesce(p_order->'cliente'->>'nombre', ''));
  v_telefono  text := btrim(coalesce(p_order->'cliente'->>'telefono', ''));
  v_direccion text := btrim(coalesce(p_order->>'direccion', ''));
  v_ahora     timestamp := now() AT TIME ZONE 'America/Santiago';
  v_bloque    text;
  v_ini       integer;
  v_est       integer;
  v_cupo      integer;
  v_pedidos   integer;
  v_delivery  integer;
  v_subtotal  integer;
  v_items     jsonb := p_items;
  v_order     orders;
  v_out       jsonb;
BEGIN
  IF NOT v_staff THEN
    SELECT * INTO v_customer FROM customers WHERE auth_user_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Necesitas una cuenta para hacer pedidos' USING ERRCODE = '42501';
    END IF;
    IF v_customer.bloqueado THEN
      RAISE EXCEPTION 'Tu cuenta está bloqueada. Escríbenos por WhatsApp.' USING ERRCODE = '42501';
    END IF;
    p_forzar := false;
  END IF;

  SELECT cupo_por_bloque INTO v_cupo FROM branches WHERE name = v_sucursal AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sucursal no válida: %', v_sucursal USING ERRCODE = '22023';
  END IF;
  IF v_tipo IS NULL OR v_tipo NOT IN ('retiro', 'delivery') THEN
    RAISE EXCEPTION 'Tipo de pedido no válido: %', v_tipo USING ERRCODE = '22023';
  END IF;
  IF v_fecha IS NULL OR coalesce(v_horario, '') !~ '^\d{1,2}:\d{2}$' THEN
    RAISE EXCEPTION 'Falta la fecha o el horario' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido no tiene productos' USING ERRCODE = '22023';
  END IF;

  -- ── Reglas del pedido de un cliente ──
  IF NOT v_staff THEN
    IF v_nombre = '' OR v_telefono = '' THEN
      RAISE EXCEPTION 'Falta tu nombre o tu teléfono' USING ERRCODE = 'SL422';
    END IF;
    IF v_tipo = 'delivery' AND length(v_direccion) < 4 THEN
      RAISE EXCEPTION 'Falta la dirección de entrega' USING ERRCODE = 'SL422';
    END IF;
    IF v_metodo NOT IN ('efectivo', 'debito', 'transferencia') THEN
      RAISE EXCEPTION 'Método de pago no válido para este pedido' USING ERRCODE = 'SL422';
    END IF;
    IF v_fecha <> v_ahora::date THEN
      RAISE EXCEPTION 'Los pedidos con cuenta son solo para hoy' USING ERRCODE = 'SL422';
    END IF;
    IF EXISTS (SELECT 1 FROM blocked_weekdays WHERE dow = extract(dow FROM v_fecha))
       AND NOT EXISTS (SELECT 1 FROM unlocked_dates WHERE date = v_fecha) THEN
      RAISE EXCEPTION 'Hoy el local está cerrado' USING ERRCODE = 'SL422';
    END IF;
    -- El cliente elige un bloque; la hora del pedido la pone la base: la
    -- estimada (ahora + preparación) si cae en ese bloque, o su inicio si es
    -- uno más tarde.
    v_ini := public.minutos(public.bloque_inicio(v_horario));
    IF NOT EXISTS (SELECT 1 FROM time_slots WHERE public.minutos(public.bloque_inicio(slot)) = v_ini) THEN
      RAISE EXCEPTION 'Ese horario no está disponible' USING ERRCODE = 'SL422';
    END IF;
    v_est := public.hora_estimada_min();
    IF v_est >= v_ini + public.bloque_minutos() OR v_est > (SELECT max(public.minutos(slot)) FROM time_slots) THEN
      RAISE EXCEPTION 'Ese horario ya pasó. Elige otro.' USING ERRCODE = 'SL422';
    END IF;
    v_horario := public.hhmm(greatest(v_est, v_ini));
    IF (SELECT count(*) FROM orders WHERE customer_id = v_customer.id AND estado <> 'completado') >= c_max_abiertos THEN
      RAISE EXCEPTION 'Ya tienes % pedidos en curso. Espera a que se completen o escríbenos por WhatsApp.', c_max_abiertos
        USING ERRCODE = 'SL429';
    END IF;

    -- Precios, nombres y datos desde el catálogo; del navegador solo se toman
    -- el producto, la cantidad y las opciones elegidas (que no cambian el precio).
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_items) i
      LEFT JOIN products p ON p.id = i->>'productId'
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id IS NULL OR NOT p.active OR NOT coalesce(c.active, true)
         OR NOT EXISTS (SELECT 1 FROM product_branches pb JOIN branches b ON b.id = pb.branch_id
                         WHERE pb.product_id = p.id AND b.name = v_sucursal)
         OR EXISTS (SELECT 1 FROM product_stock s WHERE s.product_id = p.id AND NOT s.available)
         OR coalesce((i->>'qty')::int, 1) NOT BETWEEN 1 AND 50
    ) THEN
      RAISE EXCEPTION 'Hay productos que ya no están disponibles en %', v_sucursal USING ERRCODE = 'SL422';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_items) i,
           jsonb_array_elements_text(coalesce(i->'opciones', '[]'::jsonb)) op
      WHERE NOT EXISTS (
        SELECT 1 FROM promo_options po, unnest(po.choices) ch
        WHERE po.product_id = i->>'productId' AND op = po.label || ': ' || ch
      )
    ) THEN
      RAISE EXCEPTION 'Hay una opción de promo que no es válida' USING ERRCODE = 'SL422';
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
             'cartId', coalesce(i->>'cartId', i->>'key'),
             'productId', p.id,
             'nombre', p.nombre,
             'precio', p.precio,
             'piezas', p.piezas,
             'cat', c.name,
             'desc', coalesce(p.desc_text, ''),
             'cambios', '[]'::jsonb,
             'opcionesStr', (SELECT coalesce(string_agg(op, ' · '), '') FROM jsonb_array_elements_text(coalesce(i->'opciones', '[]'::jsonb)) op),
             'obsModal', '',
             'qty', coalesce((i->>'qty')::int, 1)
           ) ORDER BY ord)
      INTO v_items
      FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(i, ord)
      JOIN products p ON p.id = i->>'productId'
      LEFT JOIN categories c ON c.id = p.category_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) i
    WHERE coalesce((i->>'qty')::int, 1) < 1
       OR (i->>'precio')::int IS NULL
       OR (i->>'precio')::int < 0
       OR coalesce(i->>'nombre', '') = ''
  ) THEN
    RAISE EXCEPTION 'Hay productos con cantidad, precio o nombre no válidos' USING ERRCODE = '22023';
  END IF;

  v_bloque := public.bloque_inicio(v_horario);

  -- Un pedido a la vez por sucursal, fecha y bloque, para que dos pedidos
  -- simultáneos no pasen el cupo.
  PERFORM pg_advisory_xact_lock(hashtext(v_sucursal || '|' || v_fecha::text || '|' || v_bloque));

  SELECT count(*) INTO v_pedidos
    FROM orders
   WHERE sucursal = v_sucursal
     AND fecha = v_fecha
     AND public.bloque_inicio(horario) = v_bloque;

  IF v_pedidos >= v_cupo AND NOT coalesce(p_forzar, false) THEN
    RAISE EXCEPTION 'El bloque de las % está lleno (%/%)', v_bloque, v_pedidos, v_cupo
      USING ERRCODE = 'SL409',
            DETAIL = json_build_object('bloque', v_bloque, 'pedidos', v_pedidos, 'cupo', v_cupo)::text;
  END IF;

  -- Mismo cálculo que utils/cart.js: (precio + extras) × cantidad, más el
  -- delivery vigente si corresponde.
  SELECT coalesce(sum(
           ((i->>'precio')::int + coalesce((
              SELECT sum(coalesce((c->>'precio')::int, 0))
              FROM jsonb_array_elements(coalesce(i->'cambios', '[]'::jsonb)) c
            ), 0)) * coalesce((i->>'qty')::int, 1)
         ), 0)
    INTO v_subtotal
    FROM jsonb_array_elements(v_items) i;

  SELECT CASE WHEN v_tipo = 'delivery' THEN costo_delivery ELSE 0 END
    INTO v_delivery
    FROM app_settings
   LIMIT 1;

  INSERT INTO orders (
    order_number, estado, fuente, sucursal, tipo, direccion, referencia,
    fecha, horario, cliente_nombre, cliente_telefono, metodo_pago,
    observaciones, total, customer_id, cliente_email
  ) VALUES (
    get_next_order_number(),
    CASE WHEN v_staff THEN coalesce(nullif(p_order->>'estado', ''), 'abierto') ELSE 'abierto' END,
    CASE WHEN v_staff THEN coalesce(nullif(p_order->>'fuente', ''), 'web') ELSE 'cuenta_web' END,
    v_sucursal,
    v_tipo,
    v_direccion,
    btrim(coalesce(p_order->>'referencia', '')),
    v_fecha,
    v_horario,
    v_nombre,
    v_telefono,
    v_metodo,
    coalesce(p_order->>'observaciones', ''),
    v_subtotal + coalesce(v_delivery, 0),
    v_customer.id,
    coalesce(v_customer.email, '')
  )
  RETURNING * INTO v_order;

  WITH inserted AS (
    INSERT INTO order_items (
      order_id, cart_id, product_id, nombre, precio, piezas, cat, desc_text,
      cambios, opciones_str, obs_modal, qty
    )
    SELECT
      v_order.id,
      i->>'cartId',
      i->>'productId',
      i->>'nombre',
      (i->>'precio')::int,
      (i->>'piezas')::int,
      i->>'cat',
      coalesce(i->>'desc', ''),
      coalesce(i->'cambios', '[]'::jsonb),
      coalesce(i->>'opcionesStr', ''),
      coalesce(i->>'obsModal', ''),
      coalesce((i->>'qty')::int, 1)
    FROM jsonb_array_elements(v_items) i
    RETURNING *
  )
  SELECT coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb) INTO v_out FROM inserted;

  RETURN to_jsonb(v_order) || jsonb_build_object('order_items', v_out);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.hora_bloque(text);

-- ── 6. Caja ──────────────────────────────────────────────────────────────────
ALTER TABLE cash_closings ADD COLUMN IF NOT EXISTS diferencia_tarjetas integer NOT NULL DEFAULT 0;

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

  -- Misma fórmula que utils/caja.js. "pago_contra_entrega" (pedidos
  -- anteriores a efectivo/débito) cuenta como efectivo.
  v_ef_sis    := coalesce((v_sys->'ventas_por_metodo'->>'efectivo')::integer, 0)
               + coalesce((v_sys->'ventas_por_metodo'->>'pago_contra_entrega')::integer, 0);
  v_deb_sis   := coalesce((v_sys->'ventas_por_metodo'->>'debito')::integer, 0);
  v_trans_sis := coalesce((v_sys->'ventas_por_metodo'->>'transferencia')::integer, 0);
  v_esperado  := v_fondo + v_ef_sis - ((v_sys->>'total_repartidor')::integer + v_otros_sum);
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
    (v_sys->>'deliveries')::integer, (v_sys->>'tarifa_repartidor')::integer, (v_sys->>'total_repartidor')::integer,
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
