-- ========================================
-- FIX: Remove SECURITY DEFINER from views
-- ========================================
-- Views should use security_invoker = true instead

-- Fix profiles_business_directory view
ALTER VIEW public.profiles_business_directory SET (security_invoker = false);
ALTER VIEW public.profiles_business_directory SET (security_invoker = true);

-- Fix suppliers_public_directory view
ALTER VIEW public.suppliers_public_directory SET (security_invoker = false);
ALTER VIEW public.suppliers_public_directory SET (security_invoker = true);