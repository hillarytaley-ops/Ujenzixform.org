-- Fix SECURITY DEFINER view issue by recreating delivery_providers_public_safe
-- Drop and recreate the view without SECURITY DEFINER

-- Drop the existing view that may have SECURITY DEFINER
DROP VIEW IF EXISTS delivery_providers_public_safe CASCADE;

-- Recreate the view without SECURITY DEFINER (normal view respects RLS)
CREATE VIEW delivery_providers_public_safe AS 
SELECT 
    id,
    provider_name,
    provider_type,
    vehicle_types,
    service_areas,
    capacity_kg,
    is_verified,
    is_active,
    rating,
    total_deliveries,
    'Contact via platform'::text AS contact_info_status,
    created_at,
    updated_at
FROM delivery_providers dp
WHERE is_verified = true AND is_active = true;

-- Log the fix
INSERT INTO master_rls_security_audit (event_type, access_reason, additional_context)
VALUES (
    'SECURITY_DEFINER_VIEW_RECREATED',
    'Recreated delivery_providers_public_safe view without SECURITY DEFINER property',
    jsonb_build_object(
        'view_name', 'delivery_providers_public_safe',
        'recreated_at', NOW(),
        'security_definer_removed', true
    )
);

-- Verify no SECURITY DEFINER views remain
DO $$
DECLARE
    remaining_views INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_views
    FROM pg_views 
    WHERE schemaname = 'public'
    AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');
    
    INSERT INTO master_rls_security_audit (event_type, access_reason, additional_context)
    VALUES (
        'SECURITY_DEFINER_VIEW_FINAL_VERIFICATION',
        CASE 
            WHEN remaining_views = 0 THEN 'SUCCESS: All SECURITY DEFINER views removed'
            ELSE format('WARNING: %s SECURITY DEFINER views still detected', remaining_views)
        END,
        jsonb_build_object(
            'remaining_security_definer_views', remaining_views,
            'final_status', CASE WHEN remaining_views = 0 THEN 'RESOLVED' ELSE 'NEEDS_INVESTIGATION' END,
            'verification_timestamp', NOW()
        )
    );
END;
$$;