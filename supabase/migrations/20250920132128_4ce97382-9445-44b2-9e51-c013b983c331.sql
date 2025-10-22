-- Fix Security Definer View warning by removing SECURITY DEFINER property
-- This addresses the linter warning about views with SECURITY DEFINER

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS delivery_providers_public_safe;

-- Create secure view without SECURITY DEFINER to fix linter warning
CREATE VIEW delivery_providers_public_safe AS
SELECT 
    dp.id,
    dp.provider_name,
    dp.provider_type,
    dp.vehicle_types,
    dp.service_areas,
    dp.capacity_kg,
    dp.is_verified,
    dp.is_active,
    dp.rating,
    dp.total_deliveries,
    -- Contact info is now protected by RLS policies
    'Contact via platform' as contact_info_status,
    dp.created_at,
    dp.updated_at
FROM delivery_providers dp
WHERE dp.is_verified = true AND dp.is_active = true;

-- Verify security fix is complete
SELECT 
    'SECURITY FIX SUMMARY:' as status,
    COUNT(*) as secure_policies_count
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'delivery_providers'
    AND policyname LIKE '%secure%';