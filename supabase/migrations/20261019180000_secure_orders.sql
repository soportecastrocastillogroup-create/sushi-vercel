-- PRD 02 · Etapa 1 (Etapa C del PRD 01): seguridad de pedidos.
--
-- 1. anon deja de leer y escribir pedidos y fechas desbloqueadas; en
--    product_stock queda solo con lectura (la carta pública muestra agotados).
-- 2. create_order() pasa a ser la única vía para crear un pedido: el personal
--    ya no inserta directo en orders ni en order_items.
-- 3. Se eliminan las columnas de PIN de app_settings.
--
-- Pendiente para etapas siguientes: validar el cupo por hora (Etapa 2, con
-- branches.cupo_por_hora) y recalcular precios desde el catálogo (Etapa 5,
-- cuando los clientes creen pedidos). Por ahora se guardan los precios que
-- envía el panel, pero el total se calcula aquí.

-- ── 1. Cerrar el acceso de anon ─────────────────────────────────────────────
DROP POLICY IF EXISTS anon_all_orders ON orders;
DROP POLICY IF EXISTS anon_all_order_items ON order_items;
DROP POLICY IF EXISTS anon_all_unlocked_dates ON unlocked_dates;
DROP POLICY IF EXISTS anon_all_product_stock ON product_stock;

DROP POLICY IF EXISTS anon_select_product_stock ON product_stock;
CREATE POLICY anon_select_product_stock ON product_stock
  FOR SELECT TO anon USING (true);

REVOKE EXECUTE ON FUNCTION get_next_order_number() FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SEQUENCE order_number_seq FROM anon, authenticated;

-- ── 2. El personal lee, edita y borra pedidos, pero no los inserta directo ──
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['orders','order_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_all_%s ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS staff_select_%s ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS staff_update_%s ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS staff_delete_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY staff_select_%s ON %I FOR SELECT TO authenticated USING (public.is_staff())', t, t);
    EXECUTE format('CREATE POLICY staff_update_%s ON %I FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', t, t);
    EXECUTE format('CREATE POLICY staff_delete_%s ON %I FOR DELETE TO authenticated USING (public.is_staff())', t, t);
  END LOOP;
END $$;

-- ── create_order ────────────────────────────────────────────────────────────
-- p_order: { sucursal, tipo, fecha, horario, estado, fuente, direccion,
--            referencia, cliente: { nombre, telefono }, metodoPago,
--            observaciones }
-- p_items: [{ cartId, productId, nombre, precio, piezas, cat, desc, cambios,
--             opcionesStr, obsModal, qty }]
-- Devuelve la fila del pedido con sus ítems en "order_items".
CREATE OR REPLACE FUNCTION public.create_order(p_order jsonb, p_items jsonb)
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
  v_delivery integer;
  v_subtotal integer;
  v_order    orders;
  v_items    jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'No autorizado para crear pedidos' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM branches WHERE name = v_sucursal) THEN
    RAISE EXCEPTION 'Sucursal no válida: %', v_sucursal USING ERRCODE = '22023';
  END IF;
  IF v_tipo IS NULL OR v_tipo NOT IN ('retiro', 'delivery') THEN
    RAISE EXCEPTION 'Tipo de pedido no válido: %', v_tipo USING ERRCODE = '22023';
  END IF;
  IF v_fecha IS NULL OR coalesce(v_horario, '') = '' THEN
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

  -- Un pedido a la vez por sucursal, fecha y hora: deja listo el control de
  -- cupo de la Etapa 2 sin carreras entre pedidos simultáneos.
  PERFORM pg_advisory_xact_lock(
    hashtext(v_sucursal || '|' || v_fecha::text || '|' || split_part(v_horario, ':', 1))
  );

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

REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb) TO authenticated;

-- ── 3. Sin PIN ──────────────────────────────────────────────────────────────
ALTER TABLE app_settings
  DROP COLUMN IF EXISTS admin_pin,
  DROP COLUMN IF EXISTS kitchen_pin,
  DROP COLUMN IF EXISTS reportes_pin;
