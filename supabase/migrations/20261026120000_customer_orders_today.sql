-- Pedido con cuenta solo para hoy (decisión de Bruno Veinz, 26 oct 2026):
-- es comida, así que el cliente no elige día. create_order rechaza otra fecha
-- con SL422. El personal (panel) puede seguir cargando pedidos para otros días.
--
-- Igual a la versión de 20261020020000_customer_accounts.sql salvo la regla de
-- la fecha.

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
  v_hora      integer;
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

  SELECT cupo_por_hora INTO v_cupo FROM branches WHERE name = v_sucursal AND active;
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
    IF v_metodo NOT IN ('transferencia', 'pago_contra_entrega') OR (v_tipo = 'delivery' AND v_metodo <> 'transferencia') THEN
      RAISE EXCEPTION 'Método de pago no válido para este pedido' USING ERRCODE = 'SL422';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM time_slots WHERE slot = v_horario) THEN
      RAISE EXCEPTION 'Ese horario no está disponible' USING ERRCODE = 'SL422';
    END IF;
    IF v_fecha <> v_ahora::date THEN
      RAISE EXCEPTION 'Los pedidos con cuenta son solo para hoy' USING ERRCODE = 'SL422';
    END IF;
    IF EXISTS (SELECT 1 FROM blocked_weekdays WHERE dow = extract(dow FROM v_fecha))
       AND NOT EXISTS (SELECT 1 FROM unlocked_dates WHERE date = v_fecha) THEN
      RAISE EXCEPTION 'Hoy el local está cerrado' USING ERRCODE = 'SL422';
    END IF;
    IF v_fecha = v_ahora::date AND (v_fecha + v_horario::time) < v_ahora + interval '30 minutes' THEN
      RAISE EXCEPTION 'Ese horario ya no está disponible hoy' USING ERRCODE = 'SL422';
    END IF;
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
