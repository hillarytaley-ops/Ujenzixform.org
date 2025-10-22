-- ============================================================================
-- CRITICAL SECURITY FIX: Profiles, Suppliers, and Quotation Requests
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE - Restrict to owner and admin only
-- ============================================================================

-- Drop any overly permissive policies on profiles
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_authenticated_read" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profile owner can view and update their own profile
CREATE POLICY "profiles_owner_full_access"
ON profiles FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view and update all profiles
CREATE POLICY "profiles_admin_full_access"
ON profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block all anonymous access
CREATE POLICY "profiles_block_anonymous"
ON profiles FOR ALL
TO anon
USING (false);

-- ============================================================================
-- 2. SUPPLIERS TABLE - Protect contact information with business verification
-- ============================================================================

-- Create a secure view for suppliers without contact information
CREATE OR REPLACE VIEW suppliers_public_directory AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  'PROTECTED - Business verification required'::text as contact_status
FROM suppliers
WHERE is_verified = true;

-- Grant access to the view
GRANT SELECT ON suppliers_public_directory TO authenticated;

-- Create a secure function to get supplier contact info with business verification
CREATE OR REPLACE FUNCTION get_supplier_contact_verified(supplier_uuid uuid)
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_owner boolean;
  has_recent_purchase boolean;
BEGIN
  -- Check if user is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Check if user owns this supplier record
  SELECT EXISTS(
    SELECT 1 FROM suppliers 
    WHERE id = supplier_uuid AND user_id = auth.uid()
  ) INTO is_owner;
  
  -- Check for recent purchase orders (business relationship)
  SELECT EXISTS(
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = supplier_uuid
    AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed')
    AND po.created_at > NOW() - INTERVAL '90 days'
  ) INTO has_recent_purchase;
  
  -- Log access attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'full_contact_info',
    has_recent_purchase,
    (is_admin OR is_owner OR has_recent_purchase),
    CASE
      WHEN is_admin THEN 'Admin access'
      WHEN is_owner THEN 'Supplier owner access'
      WHEN has_recent_purchase THEN 'Verified business relationship (recent purchase)'
      ELSE 'ACCESS DENIED - No business relationship'
    END,
    CASE 
      WHEN (is_admin OR is_owner OR has_recent_purchase) THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Return contact info only if authorized
  IF is_admin OR is_owner OR has_recent_purchase THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true as access_granted,
      CASE
        WHEN is_admin THEN 'Admin access'
        WHEN is_owner THEN 'Supplier owner'
        ELSE 'Verified business relationship'
      END as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return protected response
    RETURN QUERY
    SELECT 
      supplier_uuid, 'Protected'::text, 'Protected'::text, 
      'Protected'::text, 'Protected'::text, 'Protected'::text,
      false as access_granted,
      'Contact information requires verified business relationship'::text as access_reason;
  END IF;
END;
$$;

-- ============================================================================
-- 3. QUOTATION REQUESTS - Prevent cross-supplier quote visibility
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "quotations_suppliers_view_own" ON quotation_requests;
DROP POLICY IF EXISTS "quotations_requesters_view" ON quotation_requests;
DROP POLICY IF EXISTS "quotations_admins_view_all" ON quotation_requests;

-- Requester can only view their own quotations
CREATE POLICY "quotations_requester_own_only"
ON quotation_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.id = quotation_requests.requester_id
  )
);

-- Supplier can ONLY view quotes where they are THE supplier (not competitor quotes)
CREATE POLICY "quotations_supplier_assigned_only"
ON quotation_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid()
    AND s.id = quotation_requests.supplier_id
  )
);

-- Admins can view all quotations
CREATE POLICY "quotations_admin_view_all"
ON quotation_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Log quote access for audit trail
CREATE TABLE IF NOT EXISTS quotation_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  quotation_id uuid,
  supplier_id uuid,
  requester_id uuid,
  access_type text NOT NULL,
  access_granted boolean DEFAULT false,
  accessed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE quotation_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "quotation_audit_admin_only"
ON quotation_access_audit FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "quotation_audit_system_insert"
ON quotation_access_audit FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());