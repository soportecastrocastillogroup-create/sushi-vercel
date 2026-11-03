-- PRD 02 · Etapa 2: horario de pedidos base de 17:00 a 22:00 (decisión de
-- Bruno Veinz, 19 oct 2026). Solo agrega las franjas que falten: no borra las
-- que el administrador ya configuró en /panel/sitio → Datos del negocio.
INSERT INTO time_slots (slot)
SELECT to_char(t, 'HH24:MI')
FROM generate_series('2000-01-01 17:00'::timestamp, '2000-01-01 22:00'::timestamp, interval '15 minutes') t
ON CONFLICT (slot) DO NOTHING;

-- Orden cronológico.
UPDATE time_slots ts
SET sort_order = o.n
FROM (SELECT slot, row_number() OVER (ORDER BY slot) AS n FROM time_slots) o
WHERE ts.slot = o.slot;
