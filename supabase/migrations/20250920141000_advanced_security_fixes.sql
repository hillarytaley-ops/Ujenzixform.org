-- ====================================================
-- ADVANCED SECURITY FIXES FOR CRITICAL VULNERABILITIES
-- Addresses: SECURITY DEFINER views, payment data, GPS tracking
-- ====================================================

-- Issue 1: SECURITY DEFINER views bypass user-level RLS policies
-- Issue 2: Payment data potentially exposed to unauthorized users
-- Issue 3: GPS coordinates accessible for stalking/robbery planning
-- Issue 4: Insufficient RLS policies on financial and location data

-- ====================================================
-- PART 1: REMOVE ALL SECURITY DEFINER VIEWS
-- ====================================================

-- Drop any remaining SECURITY DEFINER views that bypass RLS
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    -- Find and drop all SECURITY DEFINER views
    FOR view_rec IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', view_rec.schemaname, view_rec.viewname);
        RAISE NOTICE 'Dropped SECURITY DEFINER view: %.%', view_rec.schemaname, view_rec.viewname;
    END LOOP;
END
$$;

-- ====================================================
-- PART 2: SECURE PAYMENT TABLES
-- ====================================================

-- Create payment access audit table
CREATE TABLE IF NOT EXISTS payment_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    target_payment_id UUID,
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'create', 'update', 'delete')),
    access_granted BOOLEAN NOT NULL,
    access_reason TEXT NOT NULL,
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE payment_access_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit table (admin only)
CREATE POLICY "payment_audit_admin_only" ON payment_access_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Drop existing overly permissive payment policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;

-- Create ultra-secure payment policies
CREATE POLICY "payments_owner_only" ON payments
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('builder', 'supplier', 'delivery_provider')
        )
    );

CREATE POLICY "payments_admin_access" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create secure function for payment access with audit logging
CREATE OR REPLACE FUNCTION get_payment_secure(payment_id UUID)
RETURNS TABLE(
    id UUID,
    amount NUMERIC,
    currency TEXT,
    provider TEXT,
    masked_phone TEXT,
    reference TEXT,
    description TEXT,
    status TEXT,
    can_access BOOLEAN,
    access_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    payment_record payments%ROWTYPE;
    can_access BOOLEAN := FALSE;
    access_reason TEXT := 'unauthorized';
    risk_level TEXT := 'critical';
BEGIN
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get payment record
    SELECT * INTO payment_record
    FROM payments p
    WHERE p.id = payment_id;
    
    IF payment_record IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Check access permissions
    IF current_user_profile.role = 'admin' THEN
        can_access := TRUE;
        access_reason := 'Admin access';
        risk_level := 'low';
    ELSIF payment_record.user_id = auth.uid() THEN
        can_access := TRUE;
        access_reason := 'Owner access';
        risk_level := 'low';
    ELSE
        can_access := FALSE;
        access_reason := 'Unauthorized access attempt';
        risk_level := 'critical';
    END IF;
    
    -- Log access attempt
    INSERT INTO payment_access_audit (
        user_id, target_payment_id, access_type, 
        access_granted, access_reason, risk_level
    ) VALUES (
        auth.uid(), payment_id, 'view',
        can_access, access_reason, risk_level
    );
    
    -- Return data based on access level
    IF can_access THEN
        RETURN QUERY
        SELECT 
            payment_record.id,
            payment_record.amount,
            payment_record.currency,
            payment_record.provider,
            CASE 
                WHEN payment_record.phone_number IS NOT NULL 
                THEN CONCAT(LEFT(payment_record.phone_number, 3), '***', RIGHT(payment_record.phone_number, 2))
                ELSE NULL
            END as masked_phone,
            payment_record.reference,
            payment_record.description,
            payment_record.status,
            can_access,
            access_reason,
            payment_record.created_at;
    ELSE
        RAISE EXCEPTION 'Access denied: %', access_reason;
    END IF;
END;
$$;

-- ====================================================
-- PART 3: CREATE PAYMENT_PREFERENCES TABLE WITH SECURITY
-- ====================================================

-- Create payment_preferences table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS payment_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_methods TEXT[] DEFAULT ARRAY[]::TEXT[],
    default_currency TEXT DEFAULT 'KES',
    payment_details JSONB DEFAULT '{}'::jsonb,
    security_settings JSONB DEFAULT '{
        "require_2fa": false,
        "max_transaction_limit": 100000,
        "notification_enabled": true
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payment_preferences
ALTER TABLE payment_preferences ENABLE ROW LEVEL SECURITY;

-- Create ultra-secure policies for payment_preferences
CREATE POLICY "payment_preferences_owner_only" ON payment_preferences
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('builder', 'supplier', 'delivery_provider')
        )
    );

CREATE POLICY "payment_preferences_admin_access" ON payment_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create secure function for payment preferences access
CREATE OR REPLACE FUNCTION get_payment_preferences_secure()
RETURNS TABLE(
    id UUID,
    preferred_methods TEXT[],
    default_currency TEXT,
    masked_payment_details JSONB,
    security_settings JSONB,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    prefs_record payment_preferences%ROWTYPE;
BEGIN
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get user's payment preferences
    SELECT * INTO prefs_record
    FROM payment_preferences pp
    WHERE pp.user_id = auth.uid();
    
    -- Log access attempt
    INSERT INTO payment_access_audit (
        user_id, target_payment_id, access_type, 
        access_granted, access_reason, risk_level
    ) VALUES (
        auth.uid(), NULL, 'view',
        TRUE, 'User accessing own payment preferences', 'low'
    );
    
    -- Return masked data
    RETURN QUERY
    SELECT 
        prefs_record.id,
        prefs_record.preferred_methods,
        prefs_record.default_currency,
        -- Mask sensitive payment details
        jsonb_build_object(
            'has_saved_methods', CASE WHEN jsonb_array_length(prefs_record.payment_details->'saved_methods') > 0 THEN true ELSE false END,
            'methods_count', jsonb_array_length(prefs_record.payment_details->'saved_methods')
        ) as masked_payment_details,
        prefs_record.security_settings,
        prefs_record.is_active;
END;
$$;

-- ====================================================
-- PART 4: SECURE GPS TRACKING DATA
-- ====================================================

-- Create GPS access audit table
CREATE TABLE IF NOT EXISTS gps_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    delivery_id UUID,
    access_type TEXT NOT NULL CHECK (access_type IN ('view_precise', 'view_approximate', 'update')),
    access_granted BOOLEAN NOT NULL,
    access_reason TEXT NOT NULL,
    risk_level TEXT NOT NULL DEFAULT 'high' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    precise_location_accessed BOOLEAN DEFAULT FALSE,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on GPS audit table
ALTER TABLE gps_access_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for GPS audit table (admin only)
CREATE POLICY "gps_audit_admin_only" ON gps_access_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Drop existing overly permissive delivery_tracking policies
DROP POLICY IF EXISTS "Users can view updates for their deliveries" ON delivery_updates;
DROP POLICY IF EXISTS "Suppliers can create delivery updates" ON delivery_updates;
DROP POLICY IF EXISTS "Public can track deliveries with tracking number" ON deliveries;

-- Create ultra-secure delivery tracking policies
CREATE POLICY "delivery_updates_participants_only" ON delivery_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deliveries d
            JOIN profiles p ON p.user_id = auth.uid()
            WHERE d.id = delivery_updates.delivery_id
            AND (
                -- Admin access
                p.role = 'admin' OR
                -- Builder can view their deliveries
                (p.role = 'builder' AND d.builder_id = auth.uid()) OR
                -- Supplier can view their deliveries
                (p.role = 'supplier' AND d.supplier_id = auth.uid()) OR
                -- Delivery provider can view assigned deliveries
                EXISTS (
                    SELECT 1 FROM delivery_providers dp
                    WHERE dp.user_id = p.id
                    AND d.driver_name = dp.provider_name
                )
            )
        )
    );

-- Create secure function for GPS tracking with privacy protection
CREATE OR REPLACE FUNCTION get_delivery_location_secure(delivery_id UUID, precision_level TEXT DEFAULT 'approximate')
RETURNS TABLE(
    delivery_id UUID,
    status TEXT,
    location_info TEXT,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER,
    can_access_precise BOOLEAN,
    access_reason TEXT,
    last_update TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    delivery_record deliveries%ROWTYPE;
    latest_update delivery_updates%ROWTYPE;
    can_access_precise BOOLEAN := FALSE;
    access_reason TEXT := 'unauthorized';
    risk_level TEXT := 'high';
BEGIN
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get delivery record
    SELECT * INTO delivery_record
    FROM deliveries d
    WHERE d.id = delivery_id;
    
    IF delivery_record IS NULL THEN
        RAISE EXCEPTION 'Delivery not found';
    END IF;
    
    -- Get latest tracking update
    SELECT * INTO latest_update
    FROM delivery_updates du
    WHERE du.delivery_id = delivery_id
    ORDER BY du.created_at DESC
    LIMIT 1;
    
    -- Check access permissions
    IF current_user_profile.role = 'admin' THEN
        can_access_precise := TRUE;
        access_reason := 'Admin access';
        risk_level := 'low';
    ELSIF delivery_record.builder_id = auth.uid() OR delivery_record.supplier_id = auth.uid() THEN
        can_access_precise := (precision_level = 'approximate');
        access_reason := CASE 
            WHEN delivery_record.builder_id = auth.uid() THEN 'Builder tracking own delivery'
            ELSE 'Supplier tracking assigned delivery'
        END;
        risk_level := 'medium';
    ELSIF EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.user_id = current_user_profile.id
        AND delivery_record.driver_name = dp.provider_name
    ) THEN
        can_access_precise := TRUE;
        access_reason := 'Driver updating assigned delivery';
        risk_level := 'low';
    ELSE
        can_access_precise := FALSE;
        access_reason := 'No relationship to delivery';
        risk_level := 'critical';
    END IF;
    
    -- Log GPS access attempt
    INSERT INTO gps_access_audit (
        user_id, delivery_id, access_type, 
        access_granted, access_reason, risk_level,
        precise_location_accessed
    ) VALUES (
        auth.uid(), delivery_id, 
        CASE WHEN precision_level = 'precise' THEN 'view_precise' ELSE 'view_approximate' END,
        can_access_precise, access_reason, risk_level,
        (precision_level = 'precise' AND can_access_precise)
    );
    
    -- Return location data based on access level
    IF can_access_precise OR precision_level = 'approximate' THEN
        RETURN QUERY
        SELECT 
            delivery_record.id as delivery_id,
            delivery_record.status,
            CASE 
                WHEN can_access_precise AND precision_level = 'precise' THEN 
                    COALESCE(latest_update.location, 'Location updating...')
                WHEN latest_update.latitude IS NOT NULL AND latest_update.longitude IS NOT NULL THEN
                    CONCAT(
                        ROUND(latest_update.latitude::numeric, 1)::text, 
                        ', ', 
                        ROUND(latest_update.longitude::numeric, 1)::text,
                        ' (approximate area)'
                    )
                ELSE 'General area - precise location protected'
            END as location_info,
            delivery_record.estimated_delivery,
            CASE 
                WHEN delivery_record.status = 'delivered' THEN 100
                WHEN delivery_record.status = 'in_transit' THEN 50
                WHEN delivery_record.status = 'picked_up' THEN 25
                ELSE 0
            END as progress_percentage,
            can_access_precise,
            access_reason,
            COALESCE(latest_update.created_at, delivery_record.updated_at) as last_update;
    ELSE
        RAISE EXCEPTION 'Access denied: %', access_reason;
    END IF;
END;
$$;

-- ====================================================
-- PART 5: STRENGTHEN EXISTING SECURITY POLICIES
-- ====================================================

-- Update delivery table policies to be more restrictive
DROP POLICY IF EXISTS "Suppliers can view and manage their deliveries" ON deliveries;
DROP POLICY IF EXISTS "Builders can view their deliveries" ON deliveries;

CREATE POLICY "deliveries_strict_participant_access" ON deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND (
                p.role = 'admin' OR
                (p.role = 'builder' AND deliveries.builder_id = auth.uid()) OR
                (p.role = 'supplier' AND deliveries.supplier_id = auth.uid())
            )
        )
    );

CREATE POLICY "deliveries_authorized_updates" ON deliveries
    FOR INSERT, UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND (
                p.role = 'admin' OR
                (p.role = 'supplier' AND deliveries.supplier_id = auth.uid()) OR
                EXISTS (
                    SELECT 1 FROM delivery_providers dp
                    WHERE dp.user_id = p.id
                )
            )
        )
    );

-- ====================================================
-- PART 6: CREATE LOCATION ANONYMIZATION FUNCTION
-- ====================================================

-- Function to anonymize old GPS data for privacy
CREATE OR REPLACE FUNCTION anonymize_old_gps_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    anonymized_count INTEGER := 0;
BEGIN
    -- Anonymize GPS coordinates older than 7 days
    UPDATE delivery_updates 
    SET 
        latitude = ROUND(latitude::numeric, 1), -- Reduce precision significantly
        longitude = ROUND(longitude::numeric, 1), -- Reduce precision significantly
        location = CONCAT(
            SPLIT_PART(location, ',', -1), -- Keep only general area
            ', Kenya (anonymized)'
        ),
        notes = 'Location data anonymized for privacy'
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND latitude IS NOT NULL
    AND notes != 'Location data anonymized for privacy';
    
    GET DIAGNOSTICS anonymized_count = ROW_COUNT;
    
    -- Log anonymization activity
    INSERT INTO gps_access_audit (
        user_id, delivery_id, access_type, 
        access_granted, access_reason, risk_level
    ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid, NULL, 'update',
        TRUE, CONCAT('Anonymized ', anonymized_count, ' old GPS records'), 'low'
    );
    
    RETURN anonymized_count;
END;
$$;

-- ====================================================
-- PART 7: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions for secure functions
GRANT EXECUTE ON FUNCTION get_payment_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_preferences_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION get_delivery_location_secure(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_old_gps_data() TO authenticated;

-- ====================================================
-- PART 8: CREATE SCHEDULED ANONYMIZATION JOB
-- ====================================================

-- Create function to be called by cron for regular anonymization
CREATE OR REPLACE FUNCTION scheduled_privacy_maintenance()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Anonymize old GPS data
    PERFORM anonymize_old_gps_data();
    
    -- Clean up old audit logs (keep 90 days)
    DELETE FROM payment_access_audit 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM gps_access_audit 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- ====================================================
-- PART 9: SECURITY AUDIT LOG
-- ====================================================

-- Create security audit log entry
INSERT INTO emergency_lockdown_log (
    lockdown_timestamp, 
    applied_by_user, 
    security_level,
    affected_tables,
    description
) VALUES (
    NOW(), 
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 
    'CRITICAL_SECURITY_FIXES_APPLIED',
    ARRAY['payments', 'payment_preferences', 'deliveries', 'delivery_updates', 'delivery_tracking'],
    'Advanced security fixes: Removed SECURITY DEFINER views, secured payment data with audit trails, protected GPS coordinates with precision controls, implemented location anonymization'
);

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- Verify no SECURITY DEFINER views remain
SELECT 
    'SECURITY DEFINER VIEWS CHECK' as status,
    COUNT(*) as remaining_views
FROM pg_views 
WHERE schemaname = 'public' 
AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');

-- Verify policies are in place
SELECT 
    'SECURITY POLICIES VERIFICATION' as status,
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payments', 'payment_preferences', 'deliveries', 'delivery_updates')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verify audit tables exist
SELECT 
    'AUDIT TABLES VERIFICATION' as status,
    tablename,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = t.tablename
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status
FROM (
    VALUES 
    ('payment_access_audit'),
    ('gps_access_audit')
) AS t(tablename);

-- Verify secure functions exist
SELECT 
    'SECURITY FUNCTIONS VERIFICATION' as status,
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN (
    'get_payment_secure',
    'get_payment_preferences_secure',
    'get_delivery_location_secure',
    'anonymize_old_gps_data',
    'scheduled_privacy_maintenance'
)
ORDER BY proname;
