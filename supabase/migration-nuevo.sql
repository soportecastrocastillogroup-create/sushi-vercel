-- Sushi Loncoche — migración incremental (solo lo nuevo)
-- Ejecutar en Supabase → SQL Editor si YA corriste schema.sql antes.
--
-- Agrega:
--   • Categorías Para Picar y Bebestibles
--   • Horarios cada 15 min (9 slots nuevos + reorden)
--   • 38 productos solo La Paz (pp*, bg*, bm*, bsa*, bc*, bch*, bp*, bw*, bb*, be1)
--
-- Seguro de re-ejecutar: usa ON CONFLICT / DO NOTHING.
-- No toca pedidos, PINs ni productos existentes.

-- ── Categorías nuevas ───────────────────────────────────────────────────────
INSERT INTO categories (id, name, sort_order) VALUES
  ('para_picar', 'Para Picar', 4),
  ('bebestibles', 'Bebestibles', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- ── Horarios cada 15 min ────────────────────────────────────────────────────
INSERT INTO time_slots (slot, sort_order) VALUES
  ('17:00', 1),
  ('17:15', 2),
  ('17:30', 3),
  ('17:45', 4),
  ('18:00', 5),
  ('18:15', 6),
  ('18:30', 7),
  ('18:45', 8),
  ('19:00', 9),
  ('19:15', 10),
  ('19:30', 11),
  ('19:45', 12),
  ('20:00', 13),
  ('20:15', 14),
  ('20:30', 15),
  ('20:45', 16),
  ('21:00', 17),
  ('21:15', 18),
  ('21:30', 19)
ON CONFLICT (slot) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- ── Productos nuevos (solo La Paz) ──────────────────────────────────────────
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp1', 'para_picar', 'Empanada de queso — 4u', 2500, 4, 'Media luna, frita', NULL, 29)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp2', 'para_picar', 'Empanada de queso — 8u', 4700, 8, 'Media luna, frita', NULL, 30)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp3', 'para_picar', 'Arrollado primavera — 4u', 3000, 4, 'Frito, verduras', NULL, 31)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp4', 'para_picar', 'Arrollado primavera — 8u', 5700, 8, 'Frito, verduras', NULL, 32)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp4', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp4', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp5', 'para_picar', 'Arrollado jamón y queso — 4u', 3000, 4, 'Frito', NULL, 33)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp5', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp5', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp6', 'para_picar', 'Arrollado jamón y queso — 8u', 5700, 8, 'Frito', NULL, 34)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp6', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp6', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('pp7', 'para_picar', 'Guantán — 8u', 2000, 8, 'Frito', NULL, 35)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('pp7', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('pp7', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bg1', 'bebestibles', 'Tropical Gin', 7000, NULL, 'Gin con jugo tropical', NULL, 36)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bg1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bg1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bg2', 'bebestibles', 'Gin de Verano', 7000, NULL, 'Gin refrescante de temporada', NULL, 37)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bg2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bg2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bg3', 'bebestibles', 'Dragon Gin', 7000, NULL, 'Gin premium', NULL, 38)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bg3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bg3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bg4', 'bebestibles', 'Galaxy Gin', 7000, NULL, 'Gin premium', NULL, 39)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bg4', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bg4', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bg5', 'bebestibles', 'Blue North Gin', 7000, NULL, 'Gin premium', NULL, 40)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bg5', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bg5', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bm1', 'bebestibles', 'Mojito Tradicional', 5000, NULL, 'Clásico con hierba buena', NULL, 41)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bm1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bm1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bm2', 'bebestibles', 'Mojito Frambuesa', 6000, NULL, 'Con sabor a frambuesa', NULL, 42)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bm2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bm2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bm3', 'bebestibles', 'Mojito Mango', 6000, NULL, 'Con sabor a mango', NULL, 43)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bm3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bm3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bm4', 'bebestibles', 'Mojito Maracuyá', 6000, NULL, 'Con sabor a maracuyá', NULL, 44)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bm4', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bm4', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bsa1', 'bebestibles', 'Sin Alcohol Tradicional', 5000, NULL, 'Versión sin alcohol', NULL, 45)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bsa1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bsa1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bsa2', 'bebestibles', 'Sin Alcohol Frambuesa', 5000, NULL, 'Sin alcohol, sabor frambuesa', NULL, 46)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bsa2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bsa2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bsa3', 'bebestibles', 'Sin Alcohol Mango', 5000, NULL, 'Sin alcohol, sabor mango', NULL, 47)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bsa3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bsa3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bsa4', 'bebestibles', 'Sin Alcohol Maracuyá', 5000, NULL, 'Sin alcohol, sabor maracuyá', NULL, 48)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bsa4', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bsa4', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bc1', 'bebestibles', 'Dólar de Maqui', 1000, NULL, 'Cerveza artesanal', NULL, 49)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bc1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bc1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bc2', 'bebestibles', 'Austral Calafate', 1000, NULL, 'Cerveza artesanal', NULL, 50)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bc2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bc2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bc3', 'bebestibles', 'Guzmán Toroballo', 1000, NULL, 'Cerveza artesanal', NULL, 51)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bc3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bc3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bc4', 'bebestibles', 'Cusqueña Golden', 2500, NULL, 'Cerveza importada', NULL, 52)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bc4', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bc4', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bch1', 'bebestibles', 'Chelada', 1000, NULL, 'Cerveza con limón', NULL, 53)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bch1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bch1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bch2', 'bebestibles', 'Michelada', 1000, NULL, 'Cerveza con jugo de tomate', NULL, 54)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bch2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bch2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bch3', 'bebestibles', 'Michelada Completa', 1500, NULL, 'Michelada con extras', NULL, 55)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bch3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bch3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bp1', 'bebestibles', 'Pisco Sour', 5000, NULL, 'Pisco, limón, azúcar y hielo', NULL, 56)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bp1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bp1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bp2', 'bebestibles', 'Pisco con Bebida', 5500, NULL, 'Pisco con bebida a elección', NULL, 57)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bp2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bp2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bw1', 'bebestibles', 'Whisky con Bebida', 6000, NULL, 'Whisky con bebida a elección', NULL, 58)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bw1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bw1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb1', 'bebestibles', 'Coca-Cola', 1500, NULL, '350ml', NULL, 59)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb1', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb2', 'bebestibles', 'Coca-Cola Zero', 1500, NULL, '350ml', NULL, 60)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb2', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb2', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb3', 'bebestibles', 'Pepsi', 1500, NULL, '350ml', NULL, 61)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb3', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb3', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb4', 'bebestibles', 'Pepsi Light', 1500, NULL, '350ml', NULL, 62)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb4', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb4', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb5', 'bebestibles', 'Fanta', 1500, NULL, '350ml', NULL, 63)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb5', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb5', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb6', 'bebestibles', 'Sprite', 1500, NULL, '350ml', NULL, 64)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb6', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb6', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('bb7', 'bebestibles', 'Canada Dry', 1500, NULL, 'Ginger Ale 350ml', NULL, 65)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('bb7', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('bb7', true) ON CONFLICT (product_id) DO NOTHING;
INSERT INTO products (id, category_id, nombre, precio, piezas, desc_text, envoltura_actual, sort_order)
VALUES ('be1', 'bebestibles', 'Red Bull — variedades', 2500, NULL, 'Traditional, Yellow, Purple, Green, Blue, Red o Pomelo', NULL, 66)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, piezas = EXCLUDED.piezas, desc_text = EXCLUDED.desc_text, envoltura_actual = EXCLUDED.envoltura_actual, sort_order = EXCLUDED.sort_order;
INSERT INTO product_branches (product_id, branch_id) VALUES ('be1', 'la_paz') ON CONFLICT DO NOTHING;
INSERT INTO product_stock (product_id, available) VALUES ('be1', true) ON CONFLICT (product_id) DO NOTHING;
