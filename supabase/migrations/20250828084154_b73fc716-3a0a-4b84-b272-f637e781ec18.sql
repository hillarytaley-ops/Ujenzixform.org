-- Fix security issue: Set search_path for the function
CREATE OR REPLACE FUNCTION notify_nearby_delivery_providers(
  _notification_id UUID,
  _pickup_lat NUMERIC,
  _pickup_lng NUMERIC,
  _delivery_lat NUMERIC,
  _delivery_lng NUMERIC,
  _radius_km NUMERIC DEFAULT 25
)
RETURNS TABLE(provider_id UUID, distance_km NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate distance using Haversine formula approximation
  -- This is a simplified version - in production, use PostGIS for accurate calculations
  RETURN QUERY
  SELECT 
    dp.id,
    SQRT(
      POWER(69.1 * (_pickup_lat - COALESCE(dp.current_latitude, 0)), 2) +
      POWER(69.1 * (_pickup_lng - COALESCE(dp.current_longitude, 0)) * COS(_pickup_lat / 57.3), 2)
    ) as distance
  FROM delivery_providers dp
  WHERE dp.is_active = true 
    AND dp.is_verified = true
    AND SQRT(
      POWER(69.1 * (_pickup_lat - COALESCE(dp.current_latitude, 0)), 2) +
      POWER(69.1 * (_pickup_lng - COALESCE(dp.current_longitude, 0)) * COS(_pickup_lat / 57.3), 2)
    ) <= _radius_km
  ORDER BY distance ASC;
END;
$$;