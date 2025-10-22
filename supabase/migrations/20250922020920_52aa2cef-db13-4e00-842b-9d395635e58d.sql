-- Fix security linter warning: Function Search Path Mutable
-- Update function to have immutable search_path

CREATE OR REPLACE FUNCTION public.get_secure_driver_contact(delivery_uuid uuid, requested_field text DEFAULT 'phone'::text)
RETURNS TABLE(
  delivery_id uuid, 
  driver_name text, 
  driver_phone text, 
  driver_email text,
  can_access_contact boolean, 
  security_message text,
  access_level text
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log access attempt
  INSERT INTO public.driver_personal_data_audit (
    user_id, driver_id, access_type, access_granted,
    sensitive_fields_accessed, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), delivery_uuid, 'secure_contact_request',
    (current_user_role = 'admin'),
    ARRAY[requested_field],
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access to driver contact'
      ELSE 'BLOCKED: Unauthorized driver contact access attempt'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Only admin gets contact data
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      dcd.delivery_id,
      dcd.driver_name,
      dcd.driver_phone,
      dcd.driver_email,
      true as can_access_contact,
      'Admin access granted' as security_message,
      'admin_full_access' as access_level
    FROM driver_contact_data dcd
    WHERE dcd.delivery_id = delivery_uuid;
  ELSE
    -- Return protected response
    RETURN QUERY
    SELECT 
      delivery_uuid,
      'Driver information protected'::text,
      'Contact via platform only'::text,
      'Contact via platform only'::text,
      false as can_access_contact,
      'Driver contact information is admin-only protected for security'::text,
      'access_denied'::text;
  END IF;
END;
$$;