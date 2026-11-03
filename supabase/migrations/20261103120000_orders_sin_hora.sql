-- Pedidos sin hora (revisión de producción, 3 nov 2026). En producción hay
-- pedidos presenciales con horario = '' (345 al 1 nov). minutos('') fallaba
-- con "invalid input syntax for type integer", y con él bloque_inicio(),
-- available_blocks() y create_order() para toda sucursal y día que tuviera
-- uno de esos pedidos.
--
-- Ahora minutos() devuelve NULL si el horario no es "HH:MM": el pedido no cae
-- en ningún bloque ni cuenta para el cupo. Los pedidos nuevos siguen
-- exigiendo "HH:MM" (create_order lo valida).
CREATE OR REPLACE FUNCTION public.minutos(p_horario text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_horario ~ '^\d{1,2}:\d{2}$'
    THEN split_part(p_horario, ':', 1)::integer * 60 + split_part(p_horario, ':', 2)::integer
  END
$$;
