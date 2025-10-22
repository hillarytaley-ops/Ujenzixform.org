
-- =====================================================
-- SECURITY FIX PART 2: Fix Remaining Insecure Functions
-- =====================================================
-- This migration fixes the remaining functions that still
-- check profiles.role instead of using has_role()
-- =====================================================

-- Fix audit_supplier_data_changes trigger
CREATE OR REPLACE FUNCTION public.audit_supplier_data_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_business_relationship boolean;
  is_admin boolean;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Check business relationship for the supplier being modified
  SELECT public.has_supplier_business_relationship(COALESCE(NEW.id, OLD.id)) 
  INTO has_business_relationship;
  
  -- Log data modification attempt
  INSERT INTO public.supplier_contact_security_audit (
    user_id, 
    supplier_id, 
    contact_field_requested,
    business_relationship_verified,
    access_granted,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    format('table_%s_operation', TG_OP),
    has_business_relationship,
    (is_admin OR has_business_relationship OR (TG_OP = 'INSERT' AND NEW.user_id = auth.uid())),
    CASE 
      WHEN is_admin THEN format('Admin %s operation', TG_OP)
      WHEN has_business_relationship THEN format('Verified business relationship %s', TG_OP)
      WHEN TG_OP = 'INSERT' AND NEW.user_id = auth.uid() THEN 'Owner creating own supplier record'
      ELSE format('Unauthorized %s attempt', TG_OP)
    END,
    CASE 
      WHEN is_admin OR has_business_relationship THEN 'low'
      WHEN TG_OP = 'INSERT' AND NEW.user_id = auth.uid() THEN 'low'
      ELSE 'high'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix detect_location_stalking_patterns trigger
CREATE OR REPLACE FUNCTION public.detect_location_stalking_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    recent_access_count INTEGER;
    is_admin BOOLEAN;
BEGIN
    -- Count recent access attempts by this user
    SELECT COUNT(*) INTO recent_access_count
    FROM location_access_security_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Use secure has_role function
    SELECT has_role(NEW.user_id, 'admin'::app_role) INTO is_admin;
    
    -- Detect suspicious patterns
    IF recent_access_count > 10 AND NOT is_admin THEN
        -- Log potential stalking behavior
        INSERT INTO location_access_security_audit (
            user_id, accessed_table, location_data_type,
            access_justification, risk_level
        ) VALUES (
            NEW.user_id, 'PATTERN_DETECTION', 'suspicious',
            format('POTENTIAL STALKING: %s location accesses in 10 minutes', recent_access_count),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix get_builder_deliveries_safe function
CREATE OR REPLACE FUNCTION public.get_builder_deliveries_safe(builder_uuid uuid)
RETURNS TABLE(id uuid, tracking_number text, material_type text, quantity integer, weight_kg numeric, pickup_address text, delivery_address text, status text, pickup_date date, delivery_date date, estimated_delivery_time timestamp with time zone, actual_delivery_time timestamp with time zone, vehicle_details text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, has_driver_assigned boolean, driver_display_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
  current_user_profile_id uuid;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Get current user's profile ID
  SELECT p.id INTO current_user_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  -- Only allow builders to access their own deliveries or admins to access any
  IF is_admin OR current_user_profile_id = builder_uuid THEN
    RETURN QUERY
    SELECT 
      d.id,
      d.tracking_number,
      d.material_type,
      d.quantity,
      d.weight_kg,
      d.pickup_address,
      d.delivery_address,
      d.status,
      d.pickup_date,
      d.delivery_date,
      d.estimated_delivery_time,
      d.actual_delivery_time,
      d.vehicle_details,
      d.notes,
      d.created_at,
      d.updated_at,
      false as has_driver_assigned,
      'Driver contact protected - use secure access functions' as driver_display_message
    FROM deliveries d
    WHERE d.builder_id = builder_uuid;
  END IF;
END;
$$;

-- Fix verify_supplier_business_relationship function
CREATE OR REPLACE FUNCTION public.verify_supplier_business_relationship(supplier_uuid uuid, relationship_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_profile_id uuid;
  is_admin boolean;
  existing_relationship supplier_business_relationships%ROWTYPE;
  result jsonb;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Get current user profile
  SELECT p.id INTO current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin users get automatic access
  IF is_admin THEN
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'admin_override',
      'expires_at', (now() + INTERVAL '1 hour'),
      'verification_required', false
    );
  END IF;
  
  -- Check for existing valid business relationship
  SELECT * INTO existing_relationship
  FROM supplier_business_relationships sbr
  WHERE sbr.requester_id = current_user_profile_id
    AND sbr.supplier_id = supplier_uuid
    AND sbr.expires_at > now()
    AND sbr.admin_approved = true;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'verified_business_relationship',
      'expires_at', existing_relationship.expires_at,
      'relationship_type', existing_relationship.relationship_type
    );
  END IF;
  
  -- Check for recent purchase orders (stronger verification)
  IF EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.buyer_id = current_user_profile_id
      AND po.supplier_id = supplier_uuid
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > (now() - INTERVAL '30 days')
  ) THEN
    -- Create time-limited relationship
    INSERT INTO supplier_business_relationships (
      requester_id, supplier_id, relationship_type,
      expires_at, verification_evidence, admin_approved
    ) VALUES (
      current_user_profile_id, supplier_uuid, 'purchase_order',
      (now() + INTERVAL '24 hours'), relationship_evidence, true
    ) ON CONFLICT (requester_id, supplier_id, relationship_type) 
    DO UPDATE SET 
      expires_at = (now() + INTERVAL '24 hours'),
      verification_evidence = relationship_evidence,
      admin_approved = true,
      updated_at = now();
    
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'recent_purchase_verification',
      'expires_at', (now() + INTERVAL '24 hours'),
      'verification_method', 'purchase_order'
    );
  END IF;
  
  -- No valid business relationship found
  RETURN jsonb_build_object(
    'access_granted', false,
    'access_level', 'none',
    'reason', 'No verified business relationship found',
    'requirements', 'Recent purchase order or admin approval required'
  );
END;
$$;

-- Fix verify_business_relationship_strict function
CREATE OR REPLACE FUNCTION public.verify_business_relationship_strict(target_supplier_id uuid, verification_evidence jsonb DEFAULT '{}'::jsonb, requested_access_level text DEFAULT 'basic'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Only admins can grant business verification
  IF is_admin THEN
    -- Create time-limited verification (24 hours)
    INSERT INTO supplier_business_verification (
      user_id, supplier_id, verification_type, verification_evidence,
      granted_by, expires_at, access_level
    ) VALUES (
      auth.uid(), target_supplier_id, 'admin_verified',
      verification_evidence, auth.uid(),
      now() + INTERVAL '24 hours', requested_access_level
    ) ON CONFLICT (user_id, supplier_id, verification_type)
    DO UPDATE SET
      expires_at = now() + INTERVAL '24 hours',
      verification_evidence = EXCLUDED.verification_evidence,
      access_level = EXCLUDED.access_level,
      updated_at = now(),
      is_active = true;
    
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'admin_verified',
      'expires_at', (now() + INTERVAL '24 hours'),
      'verification_method', 'admin_approval'
    );
  ELSE
    -- Non-admin users cannot access business verification
    RETURN jsonb_build_object(
      'access_granted', false,
      'access_level', 'none',
      'reason', 'Business verification restricted to administrators only',
      'requirements', 'Admin approval required for supplier contact access'
    );
  END IF;
END;
$$;

-- Fix audit_provider_contact_access trigger
CREATE OR REPLACE FUNCTION public.audit_provider_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Log all access attempts to provider data
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    (is_admin OR auth.uid() = COALESCE(NEW.user_id, OLD.user_id)),
    CASE 
      WHEN is_admin THEN format('Admin %s operation', TG_OP)
      WHEN auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN format('Provider self-%s operation', TG_OP)
      ELSE format('UNAUTHORIZED %s attempt', TG_OP)
    END,
    CASE 
      WHEN is_admin OR auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN 'low'
      ELSE 'critical'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix verify_active_delivery_access function
CREATE OR REPLACE FUNCTION public.verify_active_delivery_access(target_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_profile_id uuid;
  is_admin boolean;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Admin always has access
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Get current user profile
  SELECT p.id INTO current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Check for active delivery relationship (last 7 days)
  RETURN EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = target_provider_id
    AND dr.builder_id = current_user_profile_id
    AND dr.status IN ('pending', 'accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '7 days'
  );
END;
$$;

-- Fix get_payment_secure function
CREATE OR REPLACE FUNCTION public.get_payment_secure(payment_uuid uuid)
RETURNS TABLE(id uuid, user_id uuid, amount numeric, currency text, provider text, reference text, description text, status text, transaction_id text, created_at timestamp with time zone, updated_at timestamp with time zone, phone_number_masked text, provider_response_summary jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Only admins can access payment data
  IF NOT is_admin THEN
    RETURN;
  END IF;
  
  -- Log payment access for audit
  INSERT INTO payment_access_audit (
    user_id, payment_id, access_type, access_granted
  ) VALUES (
    auth.uid(), payment_uuid, 'secure_payment_access', true
  );
  
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.amount,
    p.currency,
    p.provider,
    p.reference,
    p.description,
    p.status,
    p.transaction_id,
    p.created_at,
    p.updated_at,
    -- Mask phone number for privacy
    CASE 
      WHEN p.phone_number IS NOT NULL 
      THEN '***-***-' || RIGHT(p.phone_number, 4)
      ELSE NULL 
    END as phone_number_masked,
    -- Sanitize provider response 
    CASE 
      WHEN p.provider_response IS NOT NULL 
      THEN jsonb_build_object(
        'success', p.provider_response->'success',
        'status', p.provider_response->'status',
        'timestamp', NOW()
      )
      ELSE NULL 
    END as provider_response_summary
  FROM payments p
  WHERE p.id = payment_uuid;
END;
$$;

-- Fix get_payment_preferences_secure function
CREATE OR REPLACE FUNCTION public.get_payment_preferences_secure(user_uuid uuid)
RETURNS TABLE(id uuid, user_id uuid, payment_method text, is_default boolean, created_at timestamp with time zone, has_encrypted_details boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Use secure has_role function
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Only admins can access payment preferences
  IF NOT is_admin THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    pp.id,
    pp.user_id,
    pp.payment_method,
    pp.is_default,
    pp.created_at,
    -- Don't return actual payment details, just indicate if encrypted data exists
    (pp.payment_details IS NOT NULL AND jsonb_typeof(pp.payment_details) = 'object') as has_encrypted_details
  FROM payment_preferences pp
  WHERE pp.user_id = user_uuid;
END;
$$;

COMMENT ON FUNCTION public.is_admin_user_secure() IS 
  'SECURITY: Use this function for admin checks instead of checking profiles.role directly. This function uses the secure user_roles table.';
