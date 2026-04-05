-- delivery_requests: numeric lat/lng columns (DeliveryRequest.tsx inserts these; PostgREST 400 if missing)
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_latitude DOUBLE PRECISION;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;

NOTIFY pgrst, 'reload schema';
