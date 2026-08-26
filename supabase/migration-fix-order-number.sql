-- Repairs order creation after order_number_seq became out of sync.
-- Safe to run more than once. It does not delete or update existing orders.

BEGIN;

DO $$
DECLARE
  highest_order_number bigint;
  current_sequence_value bigint;
BEGIN
  SELECT COALESCE(MAX(substring(order_number FROM '^#([0-9]+)$')::bigint), 0)
  INTO highest_order_number
  FROM public.orders
  WHERE order_number ~ '^#[0-9]+$';

  SELECT last_value
  INTO current_sequence_value
  FROM public.order_number_seq;

  IF highest_order_number >= current_sequence_value THEN
    PERFORM setval('public.order_number_seq', highest_order_number, true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  LOOP
    n := nextval('public.order_number_seq');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE order_number = '#' || lpad(n::text, 3, '0')
    );
  END LOOP;

  RETURN '#' || lpad(n::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO anon;

COMMIT;
