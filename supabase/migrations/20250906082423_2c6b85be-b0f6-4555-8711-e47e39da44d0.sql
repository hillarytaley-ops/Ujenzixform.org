-- Enhanced security for delivery_providers table
-- This migration implements strict RLS policies to protect driver personal data

-- Drop existing policies to rebuild with enhanced security
DROP POLICY IF EXISTS "Providers can manage own data" ON delivery_providers;
DROP POLICY IF EXISTS "Providers: Admin and owner access only" ON delivery_providers;

-- Create ultra-secure RLS policies for delivery_providers
CREATE POLICY "delivery_providers_admin_full_access" 
ON delivery_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "delivery_providers_owner_manage_own" 
ON delivery_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
);

-- Create restricted view for sensitive data access
CREATE POLICY "delivery_providers_authorized_business_contact" 
ON delivery_providers 
FOR SELECT 
USING (
  -- Only authorized business partners can see contact info during active deliveries
  EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN delivery_requests dr ON dr.builder_id = p.id
    WHERE p.user_id = auth.uid() 
    AND dr.provider_id = delivery_providers.id 
    AND dr.status IN ('accepted', 'in_progress', 'completed')
    AND p.role = 'builder'
  )
);

-- Create secure function for delivery provider contact access
CREATE OR REPLACE FUNCTION get_secure_provider_contact(provider_uuid uuid)
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  vehicle_types text[],
  service_areas text[],
  capacity_kg numeric,
  is_verified boolean,
  is_active boolean,
  rating numeric,
  total_deliveries integer,
  can_view_contact boolean,
  masked_phone text,
  contact_available_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_access_contact boolean := false;
  provider_record delivery_providers%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
BEGIN
  -- Get provider record
  SELECT * INTO provider_record 
  FROM delivery_providers 
  WHERE delivery_providers.id = provider_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Ultra-strict access control for contact information
  IF user_profile_record.role = 'admin' THEN
    can_access_contact := true;
  ELSIF user_profile_record.id = provider_record.user_id THEN
    can_access_contact := true; -- Provider can see their own info
  ELSIF EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = provider_uuid 
    AND dr.builder_id = user_profile_record.id
    AND dr.status IN ('accepted', 'in_progress', 'completed')
  ) THEN
    can_access_contact := true; -- Active business relationship
  END IF;
  
  -- Log access attempt for security monitoring
  INSERT INTO provider_access_log (
    viewer_user_id, 
    viewed_provider_id, 
    access_type,
    business_justification
  ) VALUES (
    auth.uid(),
    provider_uuid,
    CASE WHEN can_access_contact THEN 'authorized_contact_access' ELSE 'contact_access_denied' END,
    CASE 
      WHEN user_profile_record.role = 'admin' THEN 'Admin access'
      WHEN user_profile_record.id = provider_record.user_id THEN 'Provider self-access'
      WHEN can_access_contact THEN 'Active delivery relationship'
      ELSE 'Unauthorized access attempt'
    END
  );
  
  -- Return data with strict contact protection
  RETURN QUERY SELECT
    provider_record.id,
    provider_record.provider_name,
    provider_record.provider_type,
    provider_record.vehicle_types,
    provider_record.service_areas,
    provider_record.capacity_kg,
    provider_record.is_verified,
    provider_record.is_active,
    provider_record.rating,
    provider_record.total_deliveries,
    can_access_contact,
    -- Mask phone number for unauthorized users
    CASE 
      WHEN can_access_contact THEN provider_record.phone
      WHEN provider_record.phone IS NOT NULL THEN 
        substring(provider_record.phone from 1 for 4) || '***' || substring(provider_record.phone from length(provider_record.phone) - 2)
      ELSE 'Contact via platform'
    END,
    CASE 
      WHEN can_access_contact THEN 'Full contact access authorized'
      WHEN NOT can_access_contact THEN 'Contact available through active delivery requests only'
      ELSE 'Contact information protected'
    END;
END;
$$;

-- Create audit table for provider contact access
CREATE TABLE IF NOT EXISTS provider_contact_security_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  provider_id uuid,
  access_type text NOT NULL,
  field_accessed text,
  authorized boolean DEFAULT false,
  business_justification text,
  security_level text DEFAULT 'restricted',
  ip_address inet,
  user_agent text,
  accessed_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE provider_contact_security_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "provider_contact_security_log_admin_only" 
ON provider_contact_security_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to log sensitive field access
CREATE OR REPLACE FUNCTION log_provider_sensitive_access(
  provider_uuid uuid, 
  field_name text, 
  access_granted boolean,
  justification text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO provider_contact_security_log (
    user_id,
    provider_id,
    access_type,
    field_accessed,
    authorized,
    business_justification,
    security_level
  ) VALUES (
    auth.uid(),
    provider_uuid,
    CASE WHEN access_granted THEN 'sensitive_field_access_granted' ELSE 'sensitive_field_access_denied' END,
    field_name,
    access_granted,
    COALESCE(justification, 'System access check'),
    CASE WHEN access_granted THEN 'authorized' ELSE 'restricted' END
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail main operation if logging fails
  NULL;
END;
$$;