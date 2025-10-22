-- Fix security definer view issue by dropping the view
-- We'll rely entirely on secure functions instead

DROP VIEW IF EXISTS public.suppliers_directory_public;

-- Ensure the secure functions are the ONLY way to access supplier data
-- No views, no direct table grants