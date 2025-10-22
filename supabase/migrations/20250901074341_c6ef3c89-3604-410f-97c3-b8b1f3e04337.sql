-- Fix Security Definer View issue (Lint 0010)
-- Remove the secure_delivery_view that uses SECURITY DEFINER

-- Drop the existing secure_delivery_view that uses SECURITY DEFINER
DROP VIEW IF EXISTS public.secure_delivery_view CASCADE;

-- Comment: This view was using SECURITY DEFINER which bypasses user-level RLS policies
-- and poses a security risk. Instead, applications should use the existing secure 
-- functions like get_secure_driver_contact() which properly implement access controls.