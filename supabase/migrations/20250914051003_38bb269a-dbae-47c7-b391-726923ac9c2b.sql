-- Fix function search path mutable warning by updating functions with proper search_path
-- This ensures security by preventing search_path manipulation attacks

-- Update all functions to have secure search_path settings
CREATE OR REPLACE FUNCTION public.log_provider_business_access_and_authorize(provider_uuid uuid, access_type_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_profile_record profiles%ROWTYPE;
    can_access_business_info BOOLEAN := FALSE;
    business_relationship_verified BOOLEAN := FALSE;
    access_justification TEXT := 'unauthorized_competitor_access_blocked';
    risk_level TEXT := 'high';
    active_business_exists BOOLEAN := FALSE;
    recent_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Reject unauthenticated access immediately
    IF user_profile_record.user_id IS NULL THEN
        INSERT INTO provider_business_access_audit (
            user_id, provider_id, access_type,
            access_granted, business_relationship_verified, 
            access_justification, security_risk_level,
            sensitive_fields_accessed
        ) VALUES (
            auth.uid(), provider_uuid, access_type_param,
            FALSE, FALSE, 
            'Unauthenticated access to provider business data blocked', 'critical',
            ARRAY['hourly_rate', 'per_km_rate', 'capacity_kg', 'service_areas']
        );
        RETURN FALSE;
    END IF;
    
    -- ULTRA-STRICT BUSINESS ACCESS VERIFICATION
    IF user_profile_record.role = 'admin' THEN
        can_access_business_info := TRUE;
        access_justification := 'admin_access';
        risk_level := 'low';
        
    ELSIF user_profile_record.role = 'builder' THEN
        -- Check for active delivery requests (last 48 hours)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status IN ('pending', 'accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '48 hours'
        ) INTO active_business_exists;
        
        -- Check for recent completed deliveries (last 30 days)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status = 'completed'
            AND dr.updated_at > NOW() - INTERVAL '30 days'
        ) INTO recent_business_relationship;
        
        IF active_business_exists THEN
            can_access_business_info := TRUE;
            access_justification := 'active_delivery_request';
            risk_level := 'low';
            business_relationship_verified := TRUE;
        ELSIF recent_business_relationship THEN
            can_access_business_info := TRUE;
            access_justification := 'recent_completed_delivery';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_business_info := FALSE;
            access_justification := 'no_business_relationship_with_provider';
            risk_level := 'high';
        END IF;
        
    ELSIF user_profile_record.role = 'supplier' THEN
        -- Suppliers generally should not access competitor provider data
        -- Only allow if they have a legitimate delivery coordination need
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            JOIN deliveries d ON d.builder_id = dr.builder_id
            WHERE dr.provider_id = provider_uuid 
            AND d.supplier_id IN (
                SELECT s.id FROM suppliers s WHERE s.user_id = user_profile_record.id
            )
            AND dr.status IN ('accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '24 hours'
        ) INTO active_business_exists;
        
        IF active_business_exists THEN
            can_access_business_info := TRUE;
            access_justification := 'coordination_with_active_delivery';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_business_info := FALSE;
            access_justification := 'supplier_competitor_access_blocked';
            risk_level := 'critical';
        END IF;
        
    ELSE
        can_access_business_info := FALSE;
        access_justification := 'role_not_authorized_for_provider_business_data';
        risk_level := 'high';
    END IF;
    
    -- Log all access attempts with detailed audit trail
    INSERT INTO provider_business_access_audit (
        user_id, provider_id, access_type,
        access_granted, business_relationship_verified, 
        access_justification, security_risk_level,
        sensitive_fields_accessed
    ) VALUES (
        auth.uid(), provider_uuid, access_type_param,
        can_access_business_info, business_relationship_verified, 
        access_justification, risk_level,
        CASE WHEN can_access_business_info 
             THEN ARRAY['basic_info_authorized']
             ELSE ARRAY['hourly_rate', 'per_km_rate', 'capacity_kg', 'service_areas', 'rating']
        END
    );
    
    RETURN can_access_business_info;
EXCEPTION WHEN OTHERS THEN
    -- Log error and deny access
    INSERT INTO provider_business_access_audit (
        user_id, provider_id, access_type,
        access_granted, access_justification, security_risk_level
    ) VALUES (
        auth.uid(), provider_uuid, access_type_param,
        FALSE, 'ERROR: ' || SQLERRM, 'critical'
    );
    RETURN FALSE;
END;
$function$;

-- Update other functions to have secure search_path
CREATE OR REPLACE FUNCTION public.get_suppliers_directory()
 RETURNS TABLE(id uuid, company_name text, specialties text[], materials_offered text[], rating numeric, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, contact_info_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 'Contact available to registered users'
      ELSE 'Sign up to view contact information'
    END as contact_info_status
  FROM suppliers s
  WHERE s.is_verified = true -- Only show verified suppliers in public directory
  ORDER BY s.rating DESC, s.company_name ASC;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE user_id = _user_id LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_supplier()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_builder()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder'
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_supplier_contact(supplier_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN purchase_orders po ON po.buyer_id = p.id
    LEFT JOIN quotation_requests qr ON qr.requester_id = p.id
    LEFT JOIN delivery_requests dr ON dr.builder_id = p.id
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      po.supplier_id = supplier_uuid OR
      qr.supplier_id = supplier_uuid OR
      EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = dr.provider_id AND dp.user_id = p.id
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_grn(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = user_uuid 
    AND (
      role = 'admin' OR 
      (role = 'builder' AND (user_type = 'company' OR is_professional = true))
    )
  );
$function$;