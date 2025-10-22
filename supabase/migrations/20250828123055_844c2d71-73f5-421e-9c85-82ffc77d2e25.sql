-- Create secure functions that return filtered data instead of relying on application filtering

-- Secure supplier data function - returns filtered supplier info based on user access level
CREATE OR REPLACE FUNCTION public.get_secure_supplier_data()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  -- Conditionally visible fields
  contact_person text,
  email text,
  phone text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
  is_authenticated boolean;
BEGIN
  -- Check if user is authenticated and admin
  SELECT public.is_current_user_admin() INTO is_admin_user;
  SELECT auth.uid() IS NOT NULL INTO is_authenticated;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    -- Only show contact info to admins and authenticated suppliers
    CASE 
      WHEN is_admin_user OR (is_authenticated AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = s.user_id
      )) THEN s.contact_person
      ELSE 'Contact available via platform'
    END,
    CASE 
      WHEN is_admin_user OR (is_authenticated AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = s.user_id
      )) THEN s.email
      ELSE NULL
    END,
    CASE 
      WHEN is_admin_user OR (is_authenticated AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = s.user_id
      )) THEN s.phone
      ELSE NULL
    END,
    CASE 
      WHEN is_admin_user OR (is_authenticated AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = s.user_id
      )) THEN s.address
      ELSE 'Location available to verified users'
    END
  FROM suppliers s;
END;
$$;

-- Secure delivery provider data function
CREATE OR REPLACE FUNCTION public.get_secure_provider_data()
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
  created_at timestamptz,
  updated_at timestamptz,
  -- Conditionally visible fields  
  phone text,
  email text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
  current_user_profile_id uuid;
BEGIN
  -- Check if user is admin
  SELECT public.is_current_user_admin() INTO is_admin_user;
  
  -- Get current user's profile ID
  SELECT id INTO current_user_profile_id 
  FROM profiles WHERE user_id = auth.uid();
  
  RETURN QUERY
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
    dp.created_at,
    dp.updated_at,
    -- Only show contact info to admins, the provider themselves, or active business partners
    CASE 
      WHEN is_admin_user 
        OR dp.user_id = current_user_profile_id
        OR EXISTS (
          SELECT 1 FROM delivery_requests dr
          WHERE dr.provider_id = dp.id 
            AND dr.builder_id = current_user_profile_id
            AND dr.status IN ('accepted', 'in_progress', 'completed')
        ) THEN dp.phone
      ELSE 'Available after connection'
    END,
    CASE 
      WHEN is_admin_user 
        OR dp.user_id = current_user_profile_id
        OR EXISTS (
          SELECT 1 FROM delivery_requests dr
          WHERE dr.provider_id = dp.id 
            AND dr.builder_id = current_user_profile_id
            AND dr.status IN ('accepted', 'in_progress', 'completed')
        ) THEN dp.email
      ELSE NULL
    END,
    CASE 
      WHEN is_admin_user 
        OR dp.user_id = current_user_profile_id
        OR EXISTS (
          SELECT 1 FROM delivery_requests dr
          WHERE dr.provider_id = dp.id 
            AND dr.builder_id = current_user_profile_id
            AND dr.status IN ('accepted', 'in_progress', 'completed')
        ) THEN dp.address
      ELSE 'Address available to authorized parties'
    END
  FROM delivery_providers dp;
END;
$$;