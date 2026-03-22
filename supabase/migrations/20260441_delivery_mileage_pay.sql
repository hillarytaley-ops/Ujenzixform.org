-- ============================================================
-- Delivery Mileage & Pay: config + distance support
-- Admin sets rate per km; providers see mileage and pay.
-- Round trip: supplier → delivery point → supplier
-- ============================================================

-- 1. Add distance_km to delivery_requests if not exists (one-way, supplier to delivery)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_requests' AND column_name = 'distance_km'
  ) THEN
    ALTER TABLE delivery_requests ADD COLUMN distance_km DECIMAL(10,2);
    COMMENT ON COLUMN delivery_requests.distance_km IS 'One-way distance in km (supplier to delivery point). Round trip = distance_km * 2.';
  END IF;
END $$;

-- 2. Mileage rate config (admin sets rate per km)
CREATE TABLE IF NOT EXISTS public.delivery_mileage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_per_km DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  currency TEXT NOT NULL DEFAULT 'KES',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Single row - insert if empty
INSERT INTO public.delivery_mileage_config (rate_per_km, currency)
SELECT 50.00, 'KES'
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_mileage_config LIMIT 1);

ALTER TABLE public.delivery_mileage_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage mileage config" ON public.delivery_mileage_config;
DROP POLICY IF EXISTS "Authenticated read mileage config" ON public.delivery_mileage_config;

-- Admins can manage
-- role::text avoids coercing string literals to app_role (enum may not list super_admin, etc.)
CREATE POLICY "Admins manage mileage config"
  ON public.delivery_mileage_config FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'super_admin', 'logistics_officer', 'finance_officer')));

-- Anyone authenticated can read (for pay display)
CREATE POLICY "Authenticated read mileage config"
  ON public.delivery_mileage_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

GRANT SELECT ON public.delivery_mileage_config TO authenticated;
GRANT INSERT, UPDATE ON public.delivery_mileage_config TO authenticated;

-- 3. Function: Haversine distance in km (lat/long)
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ROUND(
    (6371 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
        sin(radians(lat1)) * sin(radians(lat2))
      ))
    ))::numeric,
    2
  );
$$;

-- 4. Update distance_km from coordinates where null (one-time backfill)
UPDATE delivery_requests dr
SET distance_km = public.haversine_km(
  dr.pickup_latitude::decimal, dr.pickup_longitude::decimal,
  dr.delivery_latitude::decimal, dr.delivery_longitude::decimal
)
WHERE dr.distance_km IS NULL
  AND dr.pickup_latitude IS NOT NULL AND dr.pickup_longitude IS NOT NULL
  AND dr.delivery_latitude IS NOT NULL AND dr.delivery_longitude IS NOT NULL;

-- 5. RPC: Get provider mileage and pay summary
CREATE OR REPLACE FUNCTION public.get_provider_mileage_pay(_provider_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
  delivery_request_id UUID,
  purchase_order_id UUID,
  order_number TEXT,
  one_way_km DECIMAL,
  round_trip_km DECIMAL,
  rate_per_km DECIMAL,
  amount DECIMAL,
  delivered_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH cfg AS (
    SELECT COALESCE((SELECT rate_per_km FROM delivery_mileage_config ORDER BY updated_at DESC LIMIT 1), 50.00) AS r
  ),
  provider_ids AS (
    SELECT dp.id FROM delivery_providers dp
    WHERE dp.user_id = _provider_user_id
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = dp.user_id AND p.user_id = _provider_user_id)
  ),
  rows AS (
    SELECT
      dr.id AS delivery_request_id,
      dr.purchase_order_id,
      COALESCE(po.po_number, dr.order_number, 'N/A') AS order_number,
      COALESCE(dr.distance_km, 0) AS one_way_km,
      COALESCE(dr.distance_km, 0) * 2 AS round_trip_km,
      (SELECT r FROM cfg) AS rate_per_km,
      ROUND((COALESCE(dr.distance_km, 0) * 2 * (SELECT r FROM cfg))::numeric, 2) AS amount,
      dr.delivered_at,
      dr.status
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE (dr.provider_id = ANY(SELECT id FROM provider_ids) OR dr.provider_id = _provider_user_id)
      AND dr.status IN ('delivered', 'completed')
  )
  SELECT * FROM rows ORDER BY delivered_at DESC NULLS LAST, delivery_request_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_mileage_pay(uuid) TO authenticated;

-- 6. RPC: Admin - all providers mileage/pay summary
CREATE OR REPLACE FUNCTION public.admin_get_all_providers_mileage_pay()
RETURNS TABLE(
  provider_id UUID,
  provider_name TEXT,
  total_round_trip_km DECIMAL,
  rate_per_km DECIMAL,
  total_amount DECIMAL,
  delivery_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'logistics_officer', 'finance_officer')
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
  WITH cfg AS (
    SELECT COALESCE((SELECT rate_per_km FROM delivery_mileage_config ORDER BY updated_at DESC LIMIT 1), 50.00) AS r
  ),
  dr_provider AS (
    SELECT
      dr.id,
      COALESCE(dr.provider_id, po.delivery_provider_id) AS pid,
      COALESCE(dr.distance_km, 0) * 2 AS rt_km
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE dr.status IN ('delivered', 'completed')
      AND (dr.provider_id IS NOT NULL OR po.delivery_provider_id IS NOT NULL)
  ),
  agg AS (
    SELECT pid, SUM(rt_km) AS total_rt, COUNT(*) AS cnt
    FROM dr_provider
    GROUP BY pid
  )
  SELECT
    agg.pid AS provider_id,
    COALESCE(
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
      'Provider ' || LEFT(agg.pid::text, 8)
    ) AS provider_name,
    ROUND(agg.total_rt::numeric, 2) AS total_round_trip_km,
    (SELECT r FROM cfg) AS rate_per_km,
    ROUND((agg.total_rt * (SELECT r FROM cfg))::numeric, 2) AS total_amount,
    agg.cnt AS delivery_count
  FROM agg
  LEFT JOIN delivery_providers dp ON dp.id = agg.pid OR dp.user_id = agg.pid
  LEFT JOIN profiles p ON p.user_id = dp.user_id OR p.id = dp.user_id
  ORDER BY total_amount DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_providers_mileage_pay() TO authenticated;
