-- PRD 01 · Etapa D: sitio autoadministrable desde el panel.
--
-- Agrega fotos de productos, datos de contacto de sucursales, contenido de la
-- landing (slides y datos generales) y almacenamiento de imágenes. Solo el rol
-- `administrador` puede escribir; el público solo lee.
--
-- Desde esta migración la base de datos es la fuente de verdad de la carta.
-- No volver a ejecutar el seed de scripts/generate-schema.mjs en producción.

-- ── Columnas nuevas en el catálogo ───────────────────────────────────────────
ALTER TABLE products   ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products   ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE categories ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS direccion  text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS mapa       text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS servicios  text[] NOT NULL DEFAULT '{}';

-- ── Contenido de la landing ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  id         int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  horario    text NOT NULL DEFAULT '',
  instagram  text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_slides (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  kicker     text NOT NULL DEFAULT '',
  titulo_1   text NOT NULL DEFAULT '',
  titulo_2   text NOT NULL DEFAULT '',
  texto      text NOT NULL DEFAULT '',
  cta_label  text NOT NULL DEFAULT 'Ver la carta',
  cta_to     text NOT NULL DEFAULT '/carta',
  image_url  text,
  arte       text NOT NULL DEFAULT 'salmon' CHECK (arte IN ('salmon', 'avocado', 'tempura'))
);

-- Contenido inicial: el mismo que tenía src/content/site.js (por confirmar
-- con el cliente).
INSERT INTO site_content (id, horario, instagram)
VALUES (1, 'Martes a sábado · 17:00 a 22:00', 'https://www.instagram.com/sushi.loncoche/')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_slides (sort_order, kicker, titulo_1, titulo_2, texto, cta_label, cta_to, arte)
SELECT * FROM (VALUES
  (1, 'Loncoche · La Paz', 'Sushi', 'Loncoche', 'Pide online y retira en el local o recibe en tu casa.', 'Pedir ahora', '/carta', 'salmon'),
  (2, 'Para compartir', 'Promos', 'y combos', 'Arma tu promo eligiendo los rolls que más te gustan.', 'Ver la carta', '/carta', 'avocado'),
  (3, 'Sushi Bar Ruta 5', 'A orilla', 'de la carretera', 'Visítanos en La Paz, con acceso desde la Ruta 5 Sur.', 'Ver locales', '/locales', 'tempura')
) AS v(sort_order, kicker, titulo_1, titulo_2, texto, cta_label, cta_to, arte)
WHERE NOT EXISTS (SELECT 1 FROM site_slides);

UPDATE branches SET mapa = 'Loncoche, Araucanía, Chile', servicios = ARRAY['Retiro en local', 'Delivery']
 WHERE id = 'loncoche' AND mapa IS NULL AND servicios = '{}';
UPDATE branches SET direccion = 'Arturo Prat 597, La Paz',
                    referencia = 'Sushi Bar Ruta 5 · Acceso desde Ruta 5 Sur',
                    servicios = ARRAY['Consumo en el local', 'Retiro', 'Delivery']
 WHERE id = 'la_paz' AND direccion IS NULL AND servicios = '{}';

-- ── RLS: lectura pública y escritura de administradores ─────────────────────
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_slides  ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['site_content','site_slides']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_select_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY anon_select_%s ON %I FOR SELECT TO anon USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_select_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY auth_select_%s ON %I FOR SELECT TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Catálogo, configuración y sitio: solo administradores escriben.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['branches','categories','products','product_branches','promo_rolls','promo_options','customization_options','app_settings','time_slots','blocked_weekdays','site_content','site_slides']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_write_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY admin_write_%s ON %I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- ── Almacenamiento de imágenes ───────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png']),
  ('site-media',     'site-media',     true, 3145728, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS cms_images_insert ON storage.objects;
CREATE POLICY cms_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('product-images', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS cms_images_update ON storage.objects;
CREATE POLICY cms_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('product-images', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS cms_images_delete ON storage.objects;
CREATE POLICY cms_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('product-images', 'site-media') AND public.is_admin());
