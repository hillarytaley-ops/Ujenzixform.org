-- ============================================================
-- Fix Function Search Path Security Warnings
-- Created: December 27, 2025
-- 
-- This migration fixes the search_path security warnings for
-- trigger functions by setting an immutable search_path
-- ============================================================

-- Fix update_job_positions_updated_at function
CREATE OR REPLACE FUNCTION public.update_job_positions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_supplier_prices_updated_at function (if exists)
CREATE OR REPLACE FUNCTION public.update_supplier_prices_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;








