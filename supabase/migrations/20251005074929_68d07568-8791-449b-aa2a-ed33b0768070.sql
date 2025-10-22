-- Remove driver contact fields from deliveries table
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS driver_phone;
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS driver_name;