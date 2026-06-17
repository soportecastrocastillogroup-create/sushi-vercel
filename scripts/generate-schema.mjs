/**
 * Generates supabase/schema.sql from seed data extracted from sushi-system.jsx constants.
 * Run: node scripts/generate-schema.mjs
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Seed data (mirrors sushi-system.jsx) ─────────────────────────────────────

const branches = ["Loncoche", "La Paz"];
const categories = [
  { id: "promos", name: "Promos", sort_order: 1 },
  { id: "handrolls", name: "Handrolls", sort_order: 2 },
  { id: "rolls", name: "Rolls", sort_order: 3 },
  { id: "acompanamientos", name: "Acompañamientos", sort_order: 4 },
];

const catMap = { Promos: "promos", Handrolls: "handrolls", Rolls: "rolls", Acompañamientos: "acompanamientos" };

const products = [
  { id:"p1", cat:"Promos", nombre:"Promo 1", precio:14000, piezas:30, rolls:[{envoltura:"Queso Crema",relleno:"Pollo apanado, palta, queso crema, frutos secos"},{envoltura:"Panko",relleno:"Camarón, champiñón, queso crema"},{envoltura:"Sésamo",relleno:"Pollo, palta, queso crema"}] },
  { id:"p2", cat:"Promos", nombre:"Promo 2", precio:19500, piezas:40, rolls:[{envoltura:"Queso Crema",relleno:"Pollo apanado, palta, queso crema, frutos secos"},{envoltura:"Panko",relleno:"Camarón, champiñón, queso crema"},{envoltura:"Sésamo",relleno:"Pollo, palta, queso crema"},{envoltura:"Palta",relleno:"Camarón, cebollín, queso crema"}] },
  { id:"p3", cat:"Promos", nombre:"Promo 3", precio:25000, piezas:50, rolls:[{envoltura:"Queso Crema",relleno:"Pollo apanado, palta, queso crema, frutos secos"},{envoltura:"Salmón Ahumado",relleno:"Camarón, palta, queso crema"},{envoltura:"Palta",relleno:"Camarón, cebollín, queso crema"},{envoltura:"Sin arroz",relleno:"Pollo apanado, palta, champiñón, queso crema"},{envoltura:"Panko",relleno:"Camarón, champiñón, queso crema"}] },
  { id:"pmx", cat:"Promos", nombre:"Promo Mixta", precio:23000, piezas:60, rolls:[{envoltura:"Queso Crema",relleno:"Camarón, cebollín, queso crema"},{envoltura:"Sésamo",relleno:"Pollo, cebollín, queso crema"},{envoltura:"Ciboulette",relleno:"Pollo, palta, queso crema"},{envoltura:"Panko",relleno:"Camarón, cebollín, queso crema"},{envoltura:"Panko",relleno:"Pollo, palta, queso crema"},{envoltura:"Panko",relleno:"Pollo, cebollín, queso crema"}] },
  { id:"pef", cat:"Promos", nombre:"Promo Extra Frita", precio:19000, piezas:50, rolls:[{envoltura:"Panko",relleno:"Pollo salteado, palta, queso crema"},{envoltura:"Panko",relleno:"Pollo salteado, cebollín, queso crema"},{envoltura:"Panko",relleno:"Camarón, palta, queso crema"},{envoltura:"Panko",relleno:"Camarón, cebollín, queso crema"},{envoltura:"Panko",relleno:"Camarón, cebollín, queso crema"}] },
  { id:"pes", cat:"Promos", nombre:"Promo Especial", precio:20000, piezas:30, rolls:[{envoltura:"Mango",relleno:"Pollo apanado, palta, queso crema"},{envoltura:"Palta",relleno:"Pollo apanado, ciboulette, queso crema"},{envoltura:"Salmón Ahumado",relleno:"Salmón, ciboulette, queso crema"}] },
  { id:"pmm", cat:"Promos", nombre:"Promo Mini Mixta", precio:10000, piezas:20, rolls:[{envoltura:"Panko",relleno:"Camarón, palta, queso crema"},{envoltura:"Sésamo o Ciboulette",relleno:"Pollo apanado, palta, queso crema"}], opciones:[{label:"¿Cómo quieres tu segundo roll?",rollIdx:1,choices:["Sésamo","Ciboulette"]}] },
  { id:"pfr", cat:"Promos", nombre:"Promo Fría", precio:10000, piezas:20, rolls:[{envoltura:"Queso Crema o Palta",relleno:"Pollo apanado, palta, queso crema"},{envoltura:"Queso Crema",relleno:"Camarón, palta, queso crema"}], opciones:[{label:"¿Cómo quieres tu primer roll?",rollIdx:0,choices:["Queso Crema","Palta"]}] },
  { id:"hr1", cat:"Handrolls", nombre:"Handroll individual", precio:4000, piezas:1, desc:"Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín" },
  { id:"hr2", cat:"Handrolls", nombre:"2 Handrolls", precio:7000, piezas:2, desc:"Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín" },
  { id:"hr3", cat:"Handrolls", nombre:"3 Handrolls", precio:10000, piezas:3, desc:"Pollo, palta y queso crema  —  o  —  Pollo, queso crema y cebollín" },
  { id:"rqc1", cat:"Rolls", nombre:"Roll de Queso Crema", precio:6500, piezas:10, envolturaActual:"Queso Crema", desc:"Pollo apanado, palta, queso crema y frutos secos" },
  { id:"rqc2", cat:"Rolls", nombre:"Roll de Queso Crema", precio:6500, piezas:10, envolturaActual:"Queso Crema", desc:"Camarón apanado, cebollín y queso crema" },
  { id:"rqc3", cat:"Rolls", nombre:"Roll de Queso Crema", precio:7000, piezas:10, envolturaActual:"Queso Crema", desc:"Salmón, palta y cebollín" },
  { id:"rpk1", cat:"Rolls", nombre:"Roll de Panko", precio:6500, piezas:10, envolturaActual:"Panko", desc:"Camarón, champiñón y queso crema" },
  { id:"rpk2", cat:"Rolls", nombre:"Roll de Panko", precio:6500, piezas:10, envolturaActual:"Panko", desc:"Pollo apanado, palta y queso crema" },
  { id:"rpk3", cat:"Rolls", nombre:"Roll de Panko", precio:7000, piezas:10, envolturaActual:"Panko", desc:"Salmón, queso crema y cebollín" },
  { id:"rpa1", cat:"Rolls", nombre:"Roll de Palta", precio:6000, piezas:10, envolturaActual:"Palta", desc:"Camarón, queso crema y cebollín" },
  { id:"rpa2", cat:"Rolls", nombre:"Roll de Palta", precio:6500, piezas:10, envolturaActual:"Palta", desc:"Pollo apanado, ciboulette y queso crema" },
  { id:"rpa3", cat:"Rolls", nombre:"Roll de Palta", precio:7000, piezas:10, envolturaActual:"Palta", desc:"Salmón, queso crema y ciboulette" },
  { id:"rmg1", cat:"Rolls", nombre:"Roll de Mango", precio:7000, piezas:10, envolturaActual:"Mango", desc:"Pollo apanado, palta y queso crema" },
  { id:"rmg2", cat:"Rolls", nombre:"Roll de Mango", precio:7000, piezas:10, envolturaActual:"Mango", desc:"Camarón apanado, palta y queso crema" },
  { id:"rsa1", cat:"Rolls", nombre:"Roll de Salmón Ahumado", precio:7500, piezas:10, envolturaActual:"Salmón Ahumado", desc:"Camarón, palta y queso crema" },
  { id:"rsa2", cat:"Rolls", nombre:"Roll de Salmón Ahumado", precio:7500, piezas:10, envolturaActual:"Salmón Ahumado", desc:"Salmón, ciboulette y queso crema" },
  { id:"rcb1", cat:"Rolls", nombre:"Roll de Ciboulette", precio:6000, piezas:10, envolturaActual:"Ciboulette", desc:"Pollo apanado, queso crema y palta" },
  { id:"rcb2", cat:"Rolls", nombre:"Roll de Ciboulette", precio:6500, piezas:10, envolturaActual:"Ciboulette", desc:"Camarón apanado, queso crema y palta" },
  { id:"rss1", cat:"Rolls", nombre:"Roll de Sésamo", precio:5000, piezas:10, envolturaActual:"Sésamo", desc:"Pollo, queso crema y palta" },
  { id:"rss2", cat:"Rolls", nombre:"Roll de Sésamo", precio:6000, piezas:10, envolturaActual:"Sésamo", desc:"Camarón apanado, cebollín y queso crema" },
];

const customizations = [
  { id:"rs", tipo:"relleno", nombre:"Salmón", precio:2500, sort_order:1 },
  { id:"rp", tipo:"relleno", nombre:"Pollo", precio:500, sort_order:2 },
  { id:"rpa", tipo:"relleno", nombre:"Pollo apanado", precio:1000, sort_order:3 },
  { id:"rc", tipo:"relleno", nombre:"Camarón", precio:1000, sort_order:4 },
  { id:"rce", tipo:"relleno", nombre:"Cebollín", precio:500, sort_order:5 },
  { id:"rci", tipo:"relleno", nombre:"Ciboulette", precio:500, sort_order:6 },
  { id:"rpl", tipo:"relleno", nombre:"Palta", precio:1000, sort_order:7 },
  { id:"rch", tipo:"relleno", nombre:"Champiñones", precio:1000, sort_order:8 },
  { id:"rca", tipo:"relleno", nombre:"Camarón apanado", precio:1500, sort_order:9 },
  { id:"esa", tipo:"envoltura", nombre:"Salmón ahumado", precio:2500, sort_order:1 },
  { id:"emg", tipo:"envoltura", nombre:"Mango", precio:2000, sort_order:2 },
  { id:"epa", tipo:"envoltura", nombre:"Palta", precio:2000, sort_order:3 },
  { id:"eqc", tipo:"envoltura", nombre:"Queso crema", precio:1000, sort_order:4 },
  { id:"eci", tipo:"envoltura", nombre:"Ciboulette", precio:500, sort_order:5 },
  { id:"ese", tipo:"envoltura", nombre:"Sésamo", precio:500, sort_order:6 },
  { id:"epk", tipo:"envoltura", nombre:"Panko", precio:500, sort_order:7 },
  { id:"sac", tipo:"salsa", nombre:"Salsa acevichada", precio:500, sort_order:1 },
  { id:"sso", tipo:"salsa", nombre:"Soya", precio:500, sort_order:2 },
  { id:"sag", tipo:"salsa", nombre:"Salsa agridulce", precio:500, sort_order:3 },
  { id:"solo_pollo", tipo:"especial", nombre:"Toda la promo solo pollo", precio:500, sort_order:1 },
];

const timeSlots = ["17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"];
const blockedWeekdays = [0, 1, 2];

const esc = (s) => (s ?? "").replace(/'/g, "''");

const ddl = `-- Sushi Loncoche — Supabase schema
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
`;

let seed = "";

seed += `INSERT INTO branches (id, name, sort_order) VALUES\n`;
seed += branches.map((b, i) => `  ('${esc(b.toLowerCase().replace(/ /g, "_"))}', '${esc(b)}', ${i + 1})`).join(",\n");
seed += `\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;\n\n`;

seed += `INSERT INTO categories (id, name, sort_order) VALUES\n`;
seed += categories.map((c) => `  ('${c.id}', '${esc(c.name)}', ${c.sort_order})`).join(",\n");
seed += `\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;\n\n`;

seed += `INSERT INTO app_settings (id, costo_delivery, whatsapp_num, max_cambios, admin_pin, kitchen_pin, reportes_pin, max_por_horario, alerta_pedidos)
VALUES (1, 2000, '56966390079', 3, '1421', '1420', '1422', 4, 18)
ON CONFLICT (id) DO UPDATE SET
  costo_delivery = EXCLUDED.costo_delivery,
  whatsapp_num = EXCLUDED.whatsapp_num,
  max_cambios = EXCLUDED.max_cambios,
  admin_pin = EXCLUDED.admin_pin,
  kitchen_pin = EXCLUDED.kitchen_pin,
  reportes_pin = EXCLUDED.reportes_pin,
  max_por_horario = EXCLUDED.max_por_horario,
  alerta_pedidos = EXCLUDED.alerta_pedidos;\n\n`;

seed += `INSERT INTO time_slots (slot, sort_order) VALUES\n`;
seed += timeSlots.map((s, i) => `  ('${s}', ${i + 1})`).join(",\n");
seed += `\nON CONFLICT (slot) DO UPDATE SET sort_order = EXCLUDED.sort_order;\n\n`;

seed += `INSERT INTO blocked_weekdays (dow) VALUES\n`;
seed += blockedWeekdays.map((d) => `  (${d})`).join(",\n");
seed += `\nON CONFLICT (dow) DO NOTHING;\n\n`;

seed += `INSERT INTO customization_options (id, tipo, nombre, precio, sort_order) VALUES\n`;
seed += customizations.map((c) => `  ('${c.id}', '${c.tipo}', '${esc(c.nombre)}', ${c.precio}, ${c.sort_order})`).join(",\n");
seed += `\nON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, sort_order = EXCLUDED.sort_order;\n\n`;

products.forEach((p, idx) => {
  const catId = catMap[p.cat];
  seed += `INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('${p.id}', '${catId}', '${esc(p.nombre)}', ${p.precio}, ${p.piezas ?? "NULL"}, ${p.desc ? `'${esc(p.desc)}'` : "NULL"}, ${p.envolturaActual ? `'${esc(p.envolturaActual)}'` : "NULL"}, ${idx + 1})
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;\n`;
  branches.forEach((b) => {
    const bid = b.toLowerCase().replace(/ /g, "_");
    seed += `INSERT INTO product_branches (product_id, branch_id) VALUES ('${p.id}', '${bid}') ON CONFLICT DO NOTHING;\n`;
    seed += `INSERT INTO product_stock (product_id, available) VALUES ('${p.id}', true) ON CONFLICT (product_id) DO NOTHING;\n`;
  });
  if (p.rolls) {
    p.rolls.forEach((r, ri) => {
      seed += `INSERT INTO promo_rolls (product_id, sort_order, envoltura, relleno) SELECT '${p.id}', ${ri}, '${esc(r.envoltura)}', '${esc(r.relleno)}' WHERE NOT EXISTS (SELECT 1 FROM promo_rolls WHERE product_id='${p.id}' AND sort_order=${ri});\n`;
    });
  }
  if (p.opciones) {
    p.opciones.forEach((op) => {
      const choices = `ARRAY[${op.choices.map((c) => `'${esc(c)}'`).join(",")}]`;
      seed += `INSERT INTO promo_options (product_id, label, roll_idx, choices) SELECT '${p.id}', '${esc(op.label)}', ${op.rollIdx}, ${choices} WHERE NOT EXISTS (SELECT 1 FROM promo_options WHERE product_id='${p.id}' AND roll_idx=${op.rollIdx});\n`;
    });
  }
});

const rls = `
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
`;

const out = ddl + seed + rls;
writeFileSync(join(root, "supabase", "schema.sql"), out);
console.log("Wrote supabase/schema.sql (" + out.split("\n").length + " lines)");
