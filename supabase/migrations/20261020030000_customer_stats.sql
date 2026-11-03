-- PRD 02 · Etapa 6 (primera parte): cifras de compra por Sushero para la
-- pantalla /panel/susheros. Se calcula desde los pedidos; respeta RLS de
-- quien consulta (security_invoker), así que solo el administrador ve todas.
CREATE OR REPLACE VIEW public.customer_stats
WITH (security_invoker = true) AS
SELECT
  c.id AS customer_id,
  count(o.id)::integer AS compras,
  coalesce(sum(o.total), 0)::integer AS gasto,
  CASE WHEN count(o.id) > 0 THEN round(sum(o.total)::numeric / count(o.id))::integer ELSE 0 END AS ticket_promedio,
  min(o.fecha) AS primera_compra,
  max(o.fecha) AS ultima_compra,
  count(o.id) FILTER (WHERE o.estado <> 'completado')::integer AS en_curso
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;

REVOKE ALL ON public.customer_stats FROM anon;
