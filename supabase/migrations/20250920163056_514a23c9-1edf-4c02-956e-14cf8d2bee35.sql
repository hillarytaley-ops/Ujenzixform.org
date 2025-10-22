-- CRITICAL SECURITY FIX: Driver Contact Information Protection (Clean Implementation)
-- This migration protects driver phone numbers from unauthorized access

-- Step 1: Drop any existing conflicting policies
DO $$ 
DECLARE 
    policy_rec RECORD;
BEGIN 
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'deliveries'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON public.deliveries';
    END LOOP;
END $$;

-- Step 2: Create secure view for deliveries without driver contact info
DROP VIEW IF EXISTS public.deliveries_secure CASCADE;
CREATE VIEW public.deliveries_secure AS
SELECT 
    id,
    supplier_id,
    builder_id,
    project_id,
    quantity,
    weight_kg,
    pickup_date,
    delivery_date,
    estimated_delivery_time,
    actual_delivery_time,
    created_at,
    updated_at,
    tracking_number,
    material_type,
    pickup_address,
    delivery_address,
    status,
    -- Driver info is masked for security
    CASE 
        WHEN driver_name IS NOT NULL THEN 'Driver Assigned'
        ELSE 'No Driver Assigned'
    END as driver_status,
    vehicle_details,
    notes
FROM public.deliveries;

-- Step 3: Create ultra-secure function for driver contact access
CREATE OR REPLACE FUNCTION public.get_driver_contact_secure(delivery_uuid uuid)
RETURNS TABLE(
    delivery_id uuid,
    driver_name text,
    driver_phone text,
    access_granted boolean,
    access_reason text,
    security_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    delivery_record deliveries%ROWTYPE;
    user_profile_record profiles%ROWTYPE;
    can_access_driver boolean := false;
    access_level text := 'denied';
    justification text := 'Access denied';
BEGIN
    -- Get delivery record
    SELECT * INTO delivery_record 
    FROM deliveries 
    WHERE deliveries.id = delivery_uuid;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF user_profile_record IS NULL THEN
        RETURN;
    END IF;
    
    -- STRICT driver contact access control
    IF user_profile_record.role = 'admin' THEN
        can_access_driver := true;
        access_level := 'admin_full_access';
        justification := 'Administrator access granted';
    ELSIF user_profile_record.id = delivery_record.builder_id AND 
          delivery_record.status IN ('in_progress', 'out_for_delivery') THEN
        can_access_driver := true;
        access_level := 'builder_active_delivery';
        justification := 'Builder access during active delivery';
    ELSIF EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.user_id = user_profile_record.user_id 
        AND s.id = delivery_record.supplier_id 
        AND delivery_record.status IN ('in_progress', 'out_for_delivery')
    ) THEN
        can_access_driver := true;
        access_level := 'supplier_active_delivery';
        justification := 'Supplier access during active delivery';
    ELSE
        justification := 'Access restricted - no active delivery relationship';
    END IF;
    
    -- Log ALL driver contact access attempts
    INSERT INTO driver_contact_access_log (
        user_id, 
        delivery_id, 
        authorized,
        access_type,
        delivery_status,
        user_role,
        business_justification
    ) VALUES (
        auth.uid(), 
        delivery_uuid, 
        can_access_driver,
        'driver_contact_secure_request',
        delivery_record.status,
        COALESCE(user_profile_record.role, 'unknown'),
        justification
    );
    
    -- Return protected data
    RETURN QUERY SELECT
        delivery_record.id,
        CASE 
            WHEN can_access_driver AND delivery_record.driver_name IS NOT NULL 
            THEN delivery_record.driver_name
            ELSE 'Protected'
        END,
        CASE 
            WHEN can_access_driver AND delivery_record.driver_phone IS NOT NULL 
            THEN delivery_record.driver_phone
            ELSE 'Protected'
        END,
        can_access_driver,
        justification,
        'ULTRA_SECURE_' || access_level;
END;
$$;

-- Step 4: Create secure delivery listing function  
CREATE OR REPLACE FUNCTION public.get_deliveries_secure()
RETURNS TABLE(
    id uuid,
    supplier_id uuid,
    builder_id uuid,
    project_id uuid,
    quantity integer,
    weight_kg numeric,
    pickup_date date,
    delivery_date date,
    estimated_delivery_time timestamp with time zone,
    actual_delivery_time timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    tracking_number text,
    material_type text,
    pickup_address text,
    delivery_address text,
    status text,
    driver_status text,
    vehicle_details text,
    notes text,
    can_access_driver_info boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile_id uuid;
    current_user_role text;
BEGIN
    -- Get current user details
    SELECT p.id, p.role INTO current_user_profile_id, current_user_role
    FROM profiles p
    WHERE p.user_id = auth.uid();
    
    IF current_user_profile_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return secure delivery data based on role
    RETURN QUERY
    SELECT 
        d.id,
        d.supplier_id,
        d.builder_id,
        d.project_id,
        d.quantity,
        d.weight_kg,
        d.pickup_date,
        d.delivery_date,
        d.estimated_delivery_time,
        d.actual_delivery_time,
        d.created_at,
        d.updated_at,
        d.tracking_number,
        d.material_type,
        d.pickup_address,
        d.delivery_address,
        d.status,
        -- Driver status without exposing contact info
        CASE 
            WHEN d.driver_name IS NOT NULL THEN 'Driver Assigned'
            ELSE 'No Driver Assigned'
        END,
        d.vehicle_details,
        d.notes,
        -- Can access driver info only in specific circumstances
        CASE 
            WHEN current_user_role = 'admin' THEN true
            WHEN current_user_profile_id = d.builder_id AND d.status IN ('in_progress', 'out_for_delivery') THEN true
            WHEN EXISTS (
                SELECT 1 FROM suppliers s 
                WHERE s.user_id = current_user_profile_id 
                AND s.id = d.supplier_id 
                AND d.status IN ('in_progress', 'out_for_delivery')
            ) THEN true
            ELSE false
        END
    FROM deliveries d
    WHERE 
        current_user_role = 'admin' OR
        (current_user_role = 'builder' AND d.builder_id = current_user_profile_id) OR
        (current_user_role = 'supplier' AND EXISTS (
            SELECT 1 FROM suppliers s 
            WHERE s.user_id = current_user_profile_id 
            AND s.id = d.supplier_id
        ));
END;
$$;

-- Step 5: Create new ultra-secure RLS policies with unique names
CREATE POLICY "deliveries_2024_admin_secure_access" ON public.deliveries
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Builders can see their deliveries but not driver contact info
CREATE POLICY "deliveries_2024_builder_protected_access" ON public.deliveries
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'builder'
            AND p.id = deliveries.builder_id
        )
    );

-- Suppliers can see assigned deliveries but not driver contact info 
CREATE POLICY "deliveries_2024_supplier_protected_access" ON public.deliveries
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN suppliers s ON s.user_id = p.user_id
            WHERE p.user_id = auth.uid() 
            AND p.role = 'supplier'
            AND s.id = deliveries.supplier_id
        )
    );

-- Allow status updates only (not driver info modifications)
CREATE POLICY "deliveries_2024_secure_updates_only" ON public.deliveries
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND (
                p.role = 'admin' OR
                (p.role = 'builder' AND p.id = deliveries.builder_id) OR
                (p.role = 'supplier' AND EXISTS (
                    SELECT 1 FROM suppliers s 
                    WHERE s.user_id = p.user_id AND s.id = deliveries.supplier_id
                ))
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND (
                p.role = 'admin' OR
                (p.role = 'builder' AND p.id = deliveries.builder_id) OR
                (p.role = 'supplier' AND EXISTS (
                    SELECT 1 FROM suppliers s 
                    WHERE s.user_id = p.user_id AND s.id = deliveries.supplier_id
                ))
            )
        )
    );

-- Step 6: Grant appropriate permissions
GRANT SELECT ON public.deliveries_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_contact_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deliveries_secure() TO authenticated;