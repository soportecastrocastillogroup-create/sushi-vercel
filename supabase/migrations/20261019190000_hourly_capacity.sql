-- PRD 02 · Etapa 2: cupo por hora y por sucursal.
--
-- 1. branches.cupo_por_hora reemplaza a app_settings.max_por_horario. Cada
--    sucursal parte con el valor actual.
-- 2. create_order() valida el cupo del bloque de una hora (17:00–17:59…) en
--    esa sucursal, contando todos los pedidos del bloque (también los
--    completados). Con p_forzar = true el personal puede pasarse del cupo
--    (el panel lo pide con una confirmación).
--
-- El error de cupo lleno usa el código SL409 y trae en "detail" un JSON con
-- { hora, pedidos, cupo } para que la interfaz arme el mensaje.

-- ── 1. Cupo por sucursal ────────────────────────────────────────────────────
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS cupo_por_hora integer NOT NULL DEFAULT 4;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_settings' AND column_name = 'max_por_horario'
  ) THEN
    UPDATE branches SET cupo_por_hora = (SELECT max_por_horario FROM app_settings WHERE id = 1)
    WHERE EXISTS (SELECT 1 FROM app_settings WHERE id = 1);
  END IF;
END $$;

ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_cupo_por_hora_check;
ALTER TABLE branches ADD CONSTRAINT branches_cupo_por_hora_check CHECK (cupo_por_hora >= 1);

ALTER TABLE app_settings DROP COLUMN IF EXISTS max_por_horario;

-- Bloque horario de un "HH:MM": "20:15" → 20.
CREATE OR REPLACE FUNCTION public.hora_bloque(p_horario text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT nullif(split_part(p_horario, ':', 1), '')::integer $$;

CREATE INDEX IF NOT EXISTS idx_orders_sucursal_fecha ON orders(sucursal, fecha);

-- ── 2. create_order con cupo ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_order(jsonb, jsonb);

-- p_order: { sucursal, tipo, fecha, horario, estado, fuente, direccion,
--            referencia, cliente: { nombre, telefono }, metodoPago,
--            observaciones }
-- p_items: [{ cartId, productId, nombre, precio, piezas, cat, desc, cambios,
--             opcionesStr, obsModal, qty }]
-- p_forzar: true para pasar del cupo (solo personal, con confirmación).
-- Devuelve la fila del pedido con sus ítems en "order_items".
CREATE OR REPLACE FUNCTION public.create_order(p_order jsonb, p_items jsonb, p_forzar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sucursal text := p_order->>'sucursal';
  v_tipo     text := p_order->>'tipo';
  v_fecha    date := (p_order->>'fecha')::date;
  v_horario  text := p_order->>'horario';
  v_hora     integer;
  v_cupo     integer;
  v_pedidos  integer;
  v_delivery integer;
  v_subtotal integer;
  v_order    orders;
  v_items    jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'No autorizado para crear pedidos' USING ERRCODE = '42501';
  END IF;

  SELECT cupo_por_hora INTO v_cupo FROM branches WHERE name = v_sucursal;
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
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) i
    WHERE coalesce((i->>'qty')::int, 1) < 1
       OR (i->>'precio')::int IS NULL
       OR (i->>'precio')::int < 0
       OR coalesce(i->>'nombre', '') = ''
  ) THEN
    RAISE EXCEPTION 'Hay productos con cantidad, precio o nombre no válidos' USING ERRCODE = '22023';
  END IF;

  v_hora := public.hora_bloque(v_horario);

  -- Un pedido a la vez por sucursal, fecha y hora, para que dos pedidos
  -- simultáneos no pasen el cupo.
  PERFORM pg_advisory_xact_lock(hashtext(v_sucursal || '|' || v_fecha::text || '|' || v_hora::text));

  SELECT count(*) INTO v_pedidos
    FROM orders
   WHERE sucursal = v_sucursal
     AND fecha = v_fecha
     AND public.hora_bloque(horario) = v_hora;

  IF v_pedidos >= v_cupo AND NOT coalesce(p_forzar, false) THEN
    RAISE EXCEPTION 'El bloque de las %:00 está lleno (%/%)', v_hora, v_pedidos, v_cupo
      USING ERRCODE = 'SL409',
            DETAIL = json_build_object('hora', v_hora, 'pedidos', v_pedidos, 'cupo', v_cupo)::text;
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
    FROM jsonb_array_elements(p_items) i;

  SELECT CASE WHEN v_tipo = 'delivery' THEN costo_delivery ELSE 0 END
    INTO v_delivery
    FROM app_settings
   LIMIT 1;

  INSERT INTO orders (
    order_number, estado, fuente, sucursal, tipo, direccion, referencia,
    fecha, horario, cliente_nombre, cliente_telefono, metodo_pago,
    observaciones, total
  ) VALUES (
    get_next_order_number(),
    coalesce(nullif(p_order->>'estado', ''), 'abierto'),
    coalesce(nullif(p_order->>'fuente', ''), 'web'),
    v_sucursal,
    v_tipo,
    coalesce(p_order->>'direccion', ''),
    coalesce(p_order->>'referencia', ''),
    v_fecha,
    v_horario,
    coalesce(p_order->'cliente'->>'nombre', ''),
    coalesce(p_order->'cliente'->>'telefono', ''),
    coalesce(nullif(p_order->>'metodoPago', ''), 'transferencia'),
    coalesce(p_order->>'observaciones', ''),
    v_subtotal + coalesce(v_delivery, 0)
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
    FROM jsonb_array_elements(p_items) i
    RETURNING *
  )
  SELECT coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb) INTO v_items FROM inserted;

  RETURN to_jsonb(v_order) || jsonb_build_object('order_items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, boolean) TO authenticated;
