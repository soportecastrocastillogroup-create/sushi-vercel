-- Sushi Loncoche — Supabase schema
-- Run this file in the Supabase SQL Editor

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE customization_tipo AS ENUM ('relleno', 'envoltura', 'salsa', 'especial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Catalog ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id               text PRIMARY KEY,
  category_id      text NOT NULL REFERENCES categories(id),
  nombre           text NOT NULL,
  precio           integer NOT NULL,
  piezas           integer,
  desc_text        text,
  envoltura_actual text,
  active           boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_branches (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id  text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, branch_id)
);

CREATE TABLE IF NOT EXISTS promo_rolls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  envoltura  text NOT NULL,
  relleno    text NOT NULL
);

CREATE TABLE IF NOT EXISTS promo_options (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      text NOT NULL,
  roll_idx   int NOT NULL,
  choices    text[] NOT NULL
);

CREATE TABLE IF NOT EXISTS customization_options (
  id         text PRIMARY KEY,
  tipo       customization_tipo NOT NULL,
  nombre     text NOT NULL,
  precio     integer NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);

-- ── Settings & schedule ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id               int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  costo_delivery   integer NOT NULL DEFAULT 2000,
  whatsapp_num     text NOT NULL DEFAULT '',
  max_cambios      integer NOT NULL DEFAULT 3,
  admin_pin        text NOT NULL DEFAULT '1421',
  kitchen_pin      text NOT NULL DEFAULT '1420',
  reportes_pin     text NOT NULL DEFAULT '1422',
  max_por_horario  integer NOT NULL DEFAULT 4,
  alerta_pedidos   integer NOT NULL DEFAULT 18
);

CREATE TABLE IF NOT EXISTS time_slots (
  slot       text PRIMARY KEY,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blocked_weekdays (
  dow int PRIMARY KEY CHECK (dow BETWEEN 0 AND 6)
);

-- ── Operations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_stock (
  product_id text PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  available  boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS unlocked_dates (
  date date PRIMARY KEY
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     text UNIQUE NOT NULL,
  estado           text NOT NULL DEFAULT 'abierto',
  fuente           text NOT NULL DEFAULT 'web',
  sucursal         text NOT NULL,
  tipo             text NOT NULL,
  direccion        text DEFAULT '',
  referencia       text DEFAULT '',
  fecha            date NOT NULL,
  horario          text NOT NULL,
  cliente_nombre   text NOT NULL DEFAULT '',
  cliente_telefono text NOT NULL DEFAULT '',
  metodo_pago      text NOT NULL DEFAULT 'transferencia',
  observaciones    text DEFAULT '',
  total            integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cart_id      text,
  product_id   text,
  nombre       text NOT NULL,
  precio       integer NOT NULL,
  piezas       integer,
  cat          text,
  desc_text    text DEFAULT '',
  cambios      jsonb NOT NULL DEFAULT '[]',
  opciones_str text DEFAULT '',
  obs_modal    text DEFAULT '',
  qty          integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_orders_fecha ON orders(fecha);
CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ── Functions ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n int;
BEGIN
  n := nextval('order_number_seq');
  RETURN '#' || lpad(n::text, 3, '0');
END;
$$;

-- ── Seed (idempotent) ────────────────────────────────────────────────────────
INSERT INTO branches (id, name, sort_order) VALUES
  ('loncoche', 'Loncoche', 1),
  ('la_paz', 'La Paz', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (id, name, sort_order) VALUES
  ('promos', 'Promos', 1),
  ('handrolls', 'Handrolls', 2),
  ('rolls', 'Rolls', 3),
  ('acompanamientos', 'Acompañamientos', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO app_settings (id, costo_delivery, whatsapp_num, max_cambios, admin_pin, kitchen_pin, reportes_pin, max_por_horario, alerta_pedidos)
VALUES (1, 2000, '56966390079', 3, '1421', '1420', '1422', 4, 18)
ON CONFLICT (id) DO UPDATE SET
  costo_delivery = EXCLUDED.costo_delivery,
  whatsapp_num = EXCLUDED.whatsapp_num,
  max_cambios = EXCLUDED.max_cambios,
  admin_pin = EXCLUDED.admin_pin,
  kitchen_pin = EXCLUDED.kitchen_pin,
  reportes_pin = EXCLUDED.reportes_pin,
  max_por_horario = EXCLUDED.max_por_horario,
  alerta_pedidos = EXCLUDED.alerta_pedidos;

INSERT INTO time_slots (slot, sort_order) VALUES
  ('17:00', 1),
  ('17:30', 2),
  ('18:00', 3),
  ('18:30', 4),
  ('19:00', 5),
  ('19:30', 6),
  ('20:00', 7),
  ('20:30', 8),
  ('21:00', 9),
  ('21:30', 10)
ON CONFLICT (slot) DO UPDATE SET sort_order = EXCLUDED.sort_order;

INSERT INTO blocked_weekdays (dow) VALUES
  (0),
  (1),
  (2)
ON CONFLICT (dow) DO NOTHING;

INSERT INTO customization_options (id, tipo, nombre, precio, sort_order) VALUES
  ('rs', 'relleno', 'Salmón', 2500, 1),
  ('rp', 'relleno', 'Pollo', 500, 2),
  ('rpa', 'relleno', 'Pollo apanado', 1000, 3),
  ('rc', 'relleno', 'Camarón', 1000, 4),
  ('rce', 'relleno', 'Cebollín', 500, 5),
  ('rci', 'relleno', 'Ciboulette', 500, 6),
  ('rpl', 'relleno', 'Palta', 1000, 7),
  ('rch', 'relleno', 'Champiñones', 1000, 8),
  ('rca', 'relleno', 'Camarón apanado', 1500, 9),
  ('esa', 'envoltura', 'Salmón ahumado', 2500, 1),
  ('emg', 'envoltura', 'Mango', 2000, 2),
  ('epa', 'envoltura', 'Palta', 2000, 3),
  ('eqc', 'envoltura', 'Queso crema', 1000, 4),
  ('eci', 'envoltura', 'Ciboulette', 500, 5),
  ('ese', 'envoltura', 'Sésamo', 500, 6),
  ('epk', 'envoltura', 'Panko', 500, 7),
  ('sac', 'salsa', 'Salsa acevichada', 500, 1),
  ('sso', 'salsa', 'Soya', 500, 2),
  ('sag', 'salsa', 'Salsa agridulce', 500, 3),
  ('solo_pollo', 'especial', 'Toda la promo solo pollo', 500, 1)
ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, sort_order = EXCLUDED.sort_order;

INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('p1', 'promos', 'Promo 1', 14000, 30, NULL, NULL, 1)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('p1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('p1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('p1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('p1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p1', 0, 'Queso Crema', 'Pollo apanado, palta, queso crema, frutos secos' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p1' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p1', 1, 'Panko', 'Camarón, champiñón, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p1' AND sort_order=1);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p1', 2, 'Sésamo', 'Pollo, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p1' AND sort_order=2);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('p2', 'promos', 'Promo 2', 19500, 40, NULL, NULL, 2)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('p2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('p2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('p2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('p2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p2', 0, 'Queso Crema', 'Pollo apanado, palta, queso crema, frutos secos' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p2' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p2', 1, 'Panko', 'Camarón, champiñón, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p2' AND sort_order=1);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p2', 2, 'Sésamo', 'Pollo, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p2' AND sort_order=2);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p2', 3, 'Palta', 'Camarón, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p2' AND sort_order=3);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('p3', 'promos', 'Promo 3', 25000, 50, NULL, NULL, 3)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('p3', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('p3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('p3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('p3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p3', 0, 'Queso Crema', 'Pollo apanado, palta, queso crema, frutos secos' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p3' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p3', 1, 'Salmón Ahumado', 'Camarón, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p3' AND sort_order=1);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p3', 2, 'Palta', 'Camarón, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p3' AND sort_order=2);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p3', 3, 'Sin arroz', 'Pollo apanado, palta, champiñón, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p3' AND sort_order=3);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'p3', 4, 'Panko', 'Camarón, champiñón, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='p3' AND sort_order=4);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pmx', 'promos', 'Promo Mixta', 23000, 60, NULL, NULL, 4)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pmx', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pmx', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pmx', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pmx', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmx', 0, 'Queso Crema', 'Camarón, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmx' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmx', 1, 'Sésamo', 'Pollo, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmx' AND sort_order=1);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmx', 2, 'Ciboulette', 'Pollo, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmx' AND sort_order=2);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmx', 3, 'Panko', 'Camarón, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmx' AND sort_order=3);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmx', 4, 'Panko', 'Pollo, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmx' AND sort_order=4);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmx', 5, 'Panko', 'Pollo, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmx' AND sort_order=5);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pef', 'promos', 'Promo Extra Frita', 19000, 50, NULL, NULL, 5)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pef', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pef', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pef', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pef', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pef', 0, 'Panko', 'Pollo salteado, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pef' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pef', 1, 'Panko', 'Pollo salteado, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pef' AND sort_order=1);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pef', 2, 'Panko', 'Camarón, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pef' AND sort_order=2);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pef', 3, 'Panko', 'Camarón, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pef' AND sort_order=3);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pef', 4, 'Panko', 'Camarón, cebollín, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pef' AND sort_order=4);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pes', 'promos', 'Promo Especial', 20000, 30, NULL, NULL, 6)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pes', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pes', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pes', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pes', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pes', 0, 'Mango', 'Pollo apanado, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pes' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pes', 1, 'Palta', 'Pollo apanado, ciboulette, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pes' AND sort_order=1);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pes', 2, 'Salmón Ahumado', 'Salmón, ciboulette, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pes' AND sort_order=2);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pmm', 'promos', 'Promo Mini Mixta', 10000, 20, NULL, NULL, 7)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pmm', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pmm', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pmm', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pmm', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmm', 0, 'Panko', 'Camarón, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmm' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pmm', 1, 'Sésamo o Ciboulette', 'Pollo apanado, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pmm' AND sort_order=1);
INSERT INTO promo_options (product_id, label, roll_idx, choices) SELECT 'pmm', '¿Cómo quieres tu segundo roll?', 1, ARRAY['Sésamo','Ciboulette'] WHERE NOT EXISTS (SELECT 1 FROM promo_options WHERE product_id='pmm' AND roll_idx=1);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pfr', 'promos', 'Promo Fría', 10000, 20, NULL, NULL, 8)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pfr', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pfr', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pfr', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pfr', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pfr', 0, 'Queso Crema o Palta', 'Pollo apanado, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pfr' AND sort_order=0);
INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT 'pfr', 1, 'Queso Crema', 'Camarón, palta, queso crema' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='pfr' AND sort_order=1);
INSERT INTO promo_options (product_id, label, roll_idx, choices) SELECT 'pfr', '¿Cómo quieres tu primer roll?', 0, ARRAY['Queso Crema','Palta'] WHERE NOT EXISTS (SELECT 1 FROM promo_options WHERE product_id='pfr' AND roll_idx=0);
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('hr1', 'handrolls', 'Handroll individual', 4000, 1, 'Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín', NULL, 9)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('hr1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('hr1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('hr1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('hr1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('hr2', 'handrolls', '2 Handrolls', 7000, 2, 'Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín', NULL, 10)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('hr2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('hr2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('hr2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('hr2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('hr3', 'handrolls', '3 Handrolls', 10000, 3, 'Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín', NULL, 11)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('hr3', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('hr3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('hr3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('hr3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rqc1', 'rolls', 'Roll de Queso Crema', 6500, 10, 'Pollo apanado, palta, queso crema y frutos secos', 'Queso Crema', 12)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rqc1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rqc1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rqc1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rqc1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rqc2', 'rolls', 'Roll de Queso Crema', 6500, 10, 'Camarón apanado, cebollín y queso crema', 'Queso Crema', 13)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rqc2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rqc2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rqc2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rqc2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rqc3', 'rolls', 'Roll de Queso Crema', 7000, 10, 'Salmón, palta y cebollín', 'Queso Crema', 14)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rqc3', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rqc3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rqc3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rqc3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rpk1', 'rolls', 'Roll de Panko', 6500, 10, 'Camarón, champiñón y queso crema', 'Panko', 15)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpk1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpk1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpk1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpk1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rpk2', 'rolls', 'Roll de Panko', 6500, 10, 'Pollo apanado, palta y queso crema', 'Panko', 16)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpk2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpk2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpk2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpk2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rpk3', 'rolls', 'Roll de Panko', 7000, 10, 'Salmón, queso crema y cebollín', 'Panko', 17)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpk3', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpk3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpk3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpk3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rpa1', 'rolls', 'Roll de Palta', 6000, 10, 'Camarón, queso crema y cebollín', 'Palta', 18)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpa1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpa1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpa1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpa1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rpa2', 'rolls', 'Roll de Palta', 6500, 10, 'Pollo apanado, ciboulette y queso crema', 'Palta', 19)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpa2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpa2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpa2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpa2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rpa3', 'rolls', 'Roll de Palta', 7000, 10, 'Salmón, queso crema y ciboulette', 'Palta', 20)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpa3', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpa3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rpa3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rpa3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rmg1', 'rolls', 'Roll de Mango', 7000, 10, 'Pollo apanado, palta y queso crema', 'Mango', 21)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rmg1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rmg1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rmg1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rmg1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rmg2', 'rolls', 'Roll de Mango', 7000, 10, 'Camarón apanado, palta y queso crema', 'Mango', 22)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rmg2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rmg2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rmg2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rmg2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rsa1', 'rolls', 'Roll de Salmón Ahumado', 7500, 10, 'Camarón, palta y queso crema', 'Salmón Ahumado', 23)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rsa1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rsa1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rsa1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rsa1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rsa2', 'rolls', 'Roll de Salmón Ahumado', 7500, 10, 'Salmón, ciboulette y queso crema', 'Salmón Ahumado', 24)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rsa2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rsa2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rsa2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rsa2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rcb1', 'rolls', 'Roll de Ciboulette', 6000, 10, 'Pollo apanado, queso crema y palta', 'Ciboulette', 25)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rcb1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rcb1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rcb1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rcb1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rcb2', 'rolls', 'Roll de Ciboulette', 6500, 10, 'Camarón apanado, queso crema y palta', 'Ciboulette', 26)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rcb2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rcb2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rcb2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rcb2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rss1', 'rolls', 'Roll de Sésamo', 5000, 10, 'Pollo, queso crema y palta', 'Sésamo', 27)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rss1', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rss1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rss1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rss1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('rss2', 'rolls', 'Roll de Sésamo', 6000, 10, 'Camarón apanado, cebollín y queso crema', 'Sésamo', 28)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rss2', 'loncoche') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rss2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO product_branches (product_id, branch_id) VALUES ('rss2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('rss2', true) ON CONFLICT (product_id) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_weekdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Catalog: read-only for anon
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['branches','categories','products','product_branches','promo_rolls','promo_options','customization_options','app_settings','time_slots','blocked_weekdays']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_select_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY anon_select_%s ON %I FOR SELECT TO anon USING (true)', t, t);
  END LOOP;
END $$;

-- Operations: full access for anon (equivalent to client-side PIN model)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['product_stock','unlocked_dates','orders','order_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_all_%s ON %I', t, t);
    EXECUTE format('CREATE POLICY anon_all_%s ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

GRANT USAGE ON SEQUENCE order_number_seq TO anon;
GRANT EXECUTE ON FUNCTION get_next_order_number() TO anon;
