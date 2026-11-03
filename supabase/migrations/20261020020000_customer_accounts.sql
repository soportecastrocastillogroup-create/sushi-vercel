-- PRD 02 · Etapa 5: cuentas de clientes y pedido online.
--
-- 1. customers: la ficha del cliente (Sushero), identificada por correo. Se
--    crea sola al registrarse (trigger en auth.users con tipo = 'cliente') y
--    se enlaza a una ficha previa con el mismo correo.
-- 2. Un cliente lee y edita solo su ficha (con update_my_customer) y lee solo
--    sus pedidos. Nunca entra al panel: is_staff() no cambia.
-- 3. create_order acepta pedidos de clientes con reglas estrictas: cupo sin
--    excepciones, precios recalculados desde el catálogo, productos
--    disponibles en la sucursal, fecha y horario válidos, datos completos y
--    un máximo de pedidos sin completar por cuenta.
-- 4. available_slots(): cupos por franja para elegir horario sin ver pedidos.
--
-- Códigos de error propios: SL409 bloque lleno, SL429 demasiados pedidos
-- abiertos, SL422 dato del pedido no válido (mensaje para el cliente).

-- ── 1. Clientes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  auth_user_id          uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre                text NOT NULL DEFAULT '',
  telefono              text NOT NULL DEFAULT '',
  direccion             text NOT NULL DEFAULT '',
  referencia            text NOT NULL DEFAULT '',
  sucursal_preferida    text,
  acepta_marketing      boolean NOT NULL DEFAULT false,
  consentimiento_at     timestamptz,
  consentimiento_origen text,
  baja_at               timestamptz,
  bloqueado             boolean NOT NULL DEFAULT false,
  notas                 text NOT NULL DEFAULT '',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_key ON customers (email);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_email text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- Id de la ficha del usuario actual (null si no es cliente).
CREATE OR REPLACE FUNCTION public.my_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT id FROM customers WHERE auth_user_id = auth.uid() $$;

-- ── Alta al registrarse ─────────────────────────────────────────────────────
-- Solo para registros del sitio público (metadata tipo = 'cliente'); las
-- cuentas del personal se crean con manage-staff y no llevan ese tipo.
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m       jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_email text := lower(btrim(NEW.email));
  v_acepta boolean := coalesce((m->>'acepta_marketing')::boolean, false);
BEGIN
  IF m->>'tipo' IS DISTINCT FROM 'cliente' OR v_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO customers AS c (
    email, auth_user_id, nombre, telefono, direccion, referencia, sucursal_preferida,
    acepta_marketing, consentimiento_at, consentimiento_origen
  ) VALUES (
    v_email, NEW.id,
    btrim(coalesce(m->>'nombre', '')), btrim(coalesce(m->>'telefono', '')),
    btrim(coalesce(m->>'direccion', '')), btrim(coalesce(m->>'referencia', '')),
    nullif(m->>'sucursal_preferida', ''),
    v_acepta, CASE WHEN v_acepta THEN now() END, CASE WHEN v_acepta THEN 'Registro web' END
  )
  -- Ficha previa con el mismo correo (de un pedido del panel): se enlaza y
  -- conserva su historial. El check solo otorga consentimiento, no lo quita.
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    nombre = coalesce(nullif(EXCLUDED.nombre, ''), c.nombre),
    telefono = coalesce(nullif(EXCLUDED.telefono, ''), c.telefono),
    direccion = coalesce(nullif(EXCLUDED.direccion, ''), c.direccion),
    referencia = coalesce(nullif(EXCLUDED.referencia, ''), c.referencia),
    sucursal_preferida = coalesce(EXCLUDED.sucursal_preferida, c.sucursal_preferida),
    acepta_marketing = c.acepta_marketing OR EXCLUDED.acepta_marketing,
    consentimiento_at = CASE WHEN EXCLUDED.acepta_marketing AND NOT c.acepta_marketing THEN now() ELSE c.consentimiento_at END,
    consentimiento_origen = CASE WHEN EXCLUDED.acepta_marketing AND NOT c.acepta_marketing THEN 'Registro web' ELSE c.consentimiento_origen END,
    baja_at = CASE WHEN EXCLUDED.acepta_marketing THEN NULL ELSE c.baja_at END,
    updated_at = now()
  WHERE c.auth_user_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();

-- El cliente edita sus datos y su consentimiento; no toca notas, bloqueo ni correo.
CREATE OR REPLACE FUNCTION public.update_my_customer(p_datos jsonb)
RETURNS customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row    customers;
  v_acepta boolean;
BEGIN
  SELECT * INTO v_row FROM customers WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay una ficha de cliente para esta cuenta' USING ERRCODE = '42501';
  END IF;
  v_acepta := coalesce((p_datos->>'acepta_marketing')::boolean, v_row.acepta_marketing);

  UPDATE customers SET
    nombre = coalesce(btrim(p_datos->>'nombre'), nombre),
    telefono = coalesce(btrim(p_datos->>'telefono'), telefono),
    direccion = coalesce(btrim(p_datos->>'direccion'), direccion),
    referencia = coalesce(btrim(p_datos->>'referencia'), referencia),
    sucursal_preferida = CASE WHEN p_datos ? 'sucursal_preferida' THEN nullif(p_datos->>'sucursal_preferida', '') ELSE sucursal_preferida END,
    acepta_marketing = v_acepta,
    consentimiento_at = CASE WHEN v_acepta AND NOT v_row.acepta_marketing THEN now() ELSE consentimiento_at END,
    consentimiento_origen = CASE WHEN v_acepta AND NOT v_row.acepta_marketing THEN 'Mi cuenta' ELSE consentimiento_origen END,
    baja_at = CASE WHEN NOT v_acepta AND v_row.acepta_marketing THEN now() WHEN v_acepta THEN NULL ELSE baja_at END,
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_customer(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_customer(jsonb) TO authenticated;

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON customers FROM anon;

DROP POLICY IF EXISTS customer_select_own ON customers;
CREATE POLICY customer_select_own ON customers
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
-- Solo el administrador ve y gestiona todas las fichas (el colaborador no).
DROP POLICY IF EXISTS admin_all_customers ON customers;
CREATE POLICY admin_all_customers ON customers
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- El cliente lee sus pedidos y sus ítems; nunca los edita.
DROP POLICY IF EXISTS customer_select_orders ON orders;
CREATE POLICY customer_select_orders ON orders
  FOR SELECT TO authenticated USING (customer_id IS NOT NULL AND customer_id = public.my_customer_id());
DROP POLICY IF EXISTS customer_select_order_items ON order_items;
CREATE POLICY customer_select_order_items ON order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.customer_id IS NOT NULL AND o.customer_id = public.my_customer_id())
  );

-- Con sesión de cliente, la carta necesita ver agotados y días abiertos.
DROP POLICY IF EXISTS auth_select_product_stock ON product_stock;
CREATE POLICY auth_select_product_stock ON product_stock FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS auth_select_unlocked_dates ON unlocked_dates;
CREATE POLICY auth_select_unlocked_dates ON unlocked_dates FOR SELECT TO authenticated USING (true);

-- ── 3. Cupos por franja (sin exponer pedidos) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.available_slots(p_sucursal text, p_fecha date)
RETURNS TABLE (slot text, hora integer, pedidos integer, cupo integer, disponible boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (SELECT cupo_por_hora FROM branches WHERE name = p_sucursal),
       ocupados AS (
         SELECT public.hora_bloque(horario) AS hora, count(*)::integer AS n
         FROM orders WHERE sucursal = p_sucursal AND fecha = p_fecha
         GROUP BY 1
       )
  SELECT ts.slot,
         public.hora_bloque(ts.slot),
         coalesce(o.n, 0),
         b.cupo_por_hora,
         coalesce(o.n, 0) < b.cupo_por_hora
  FROM time_slots ts
  CROSS JOIN b
  LEFT JOIN ocupados o ON o.hora = public.hora_bloque(ts.slot)
  ORDER BY ts.slot
$$;

REVOKE ALL ON FUNCTION public.available_slots(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_slots(text, date) TO authenticated;

-- ── 4. create_order para personal y clientes ────────────────────────────────
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
    IF v_fecha < v_ahora::date OR v_fecha > v_ahora::date + 6 THEN
      RAISE EXCEPTION 'Solo se puede pedir para los próximos 7 días' USING ERRCODE = 'SL422';
    END IF;
    IF EXISTS (SELECT 1 FROM blocked_weekdays WHERE dow = extract(dow FROM v_fecha))
       AND NOT EXISTS (SELECT 1 FROM unlocked_dates WHERE date = v_fecha) THEN
      RAISE EXCEPTION 'Ese día el local está cerrado' USING ERRCODE = 'SL422';
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
