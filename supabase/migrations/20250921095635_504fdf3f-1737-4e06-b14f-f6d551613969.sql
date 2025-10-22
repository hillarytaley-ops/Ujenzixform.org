-- Fix security definer view issue by creating a secure function instead
-- Remove the view and replace with secure function

-- 1. Drop the security definer view
DROP VIEW IF EXISTS public.suppliers_contact_protected CASCADE;

-- 2. Create secure function for contact-protected supplier access
CREATE OR REPLACE FUNCTION public.get_suppliers_contact_protected()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid,
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
  current_user_role TEXT;
  current_user_profile_id uuid;
BEGIN
  -- Get current user role and profile ID
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  -- Return suppliers with contact protection based on business relationships
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
    s.user_id,
    -- Apply contact field protection
    CASE 
      WHEN current_user_role = 'admin' THEN s.contact_person
      WHEN current_user_role = 'builder' AND EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.buyer_id = current_user_profile_id 
        AND po.supplier_id = s.id 
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
      ) THEN s.contact_person
      WHEN s.contact_person IS NOT NULL THEN 'Contact via platform'
      ELSE NULL 
    END as contact_person,
    CASE 
      WHEN current_user_role = 'admin' THEN s.email
      WHEN current_user_role = 'builder' AND EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.buyer_id = current_user_profile_id 
        AND po.supplier_id = s.id 
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
      ) THEN s.email
      WHEN s.email IS NOT NULL THEN 'Available to verified partners'
      ELSE NULL 
    END as email,
    CASE 
      WHEN current_user_role = 'admin' THEN s.phone
      WHEN current_user_role = 'builder' AND EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.buyer_id = current_user_profile_id 
        AND po.supplier_id = s.id 
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
      ) THEN s.phone
      WHEN s.phone IS NOT NULL THEN 'Available to verified partners'
      ELSE NULL
    END as phone,
    CASE 
      WHEN current_user_role = 'admin' THEN s.address
      WHEN current_user_role = 'builder' AND EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.buyer_id = current_user_profile_id 
        AND po.supplier_id = s.id 
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
      ) THEN s.address
      WHEN s.address IS NOT NULL THEN 'Location available to business partners'
      ELSE NULL
    END as address
  FROM suppliers s
  WHERE 
    -- Apply RLS: only show suppliers that user can legitimately access
    (current_user_role = 'admin') OR
    (s.is_verified = true AND s.user_id != current_user_profile_id);
END;
$$;

-- 3. Log the view security fix
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SECURITY_DEFINER_VIEW_FIXED',
  'medium',
  jsonb_build_object(
    'action', 'Replaced insecure view with secure function',
    'view_removed', 'suppliers_contact_protected',
    'function_created', 'get_suppliers_contact_protected',
    'security_improvement', 'Eliminated security definer view vulnerability',
    'timestamp', NOW()
  )
);