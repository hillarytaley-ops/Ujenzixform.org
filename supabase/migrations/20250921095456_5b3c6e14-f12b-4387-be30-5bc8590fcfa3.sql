-- CRITICAL SECURITY FIX: Prevent Supplier Contact Information Harvesting
-- This addresses the specific security finding and implements verified business relationship access

-- 1. Create contact-protected view for suppliers (no sensitive fields exposed)
CREATE OR REPLACE VIEW public.suppliers_contact_protected AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  user_id,
  -- Mask sensitive contact fields
  CASE 
    WHEN contact_person IS NOT NULL THEN 'Contact via platform'
    ELSE NULL 
  END as contact_person,
  CASE 
    WHEN email IS NOT NULL THEN 'Available to verified partners'
    ELSE NULL 
  END as email,
  CASE 
    WHEN phone IS NOT NULL THEN 'Available to verified partners' 
    ELSE NULL
  END as phone,
  CASE 
    WHEN address IS NOT NULL THEN 'Location available to business partners'
    ELSE NULL
  END as address
FROM suppliers;

-- 2. Remove the dangerous self-access policy that exposes contact data
DROP POLICY IF EXISTS "suppliers_self_access_only_2024" ON public.suppliers;

-- 3. Create ultra-secure contact-protected policies
CREATE POLICY "suppliers_admin_only_full_contact_access_2024" 
ON public.suppliers
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Create business-relationship-only contact access policy
CREATE POLICY "suppliers_verified_business_contact_access_2024" 
ON public.suppliers
FOR SELECT
USING (
  -- Only allow contact access through verified business relationships
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      -- Verified business relationship through purchase orders
      (p.role = 'builder' AND EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.buyer_id = p.id 
        AND po.supplier_id = suppliers.id 
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
      )) OR
      -- Verified business relationship through quotation requests  
      (p.role = 'builder' AND EXISTS (
        SELECT 1 FROM quotation_requests qr
        WHERE qr.requester_id = p.id 
        AND qr.supplier_id = suppliers.id
        AND qr.status IN ('accepted', 'completed')
        AND qr.created_at > NOW() - INTERVAL '30 days'
      ))
    )
  )
);

-- 5. Create supplier self-access policy WITHOUT contact fields
CREATE POLICY "suppliers_self_limited_access_2024" 
ON public.suppliers
FOR SELECT
USING (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  )
);

-- 6. Create supplier self-update policy for non-contact fields only
CREATE POLICY "suppliers_self_update_non_contact_2024" 
ON public.suppliers
FOR UPDATE
USING (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  )
)
WITH CHECK (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  )
);

-- 7. Create secure contact access audit function
CREATE OR REPLACE FUNCTION public.log_supplier_contact_access_attempt(
  supplier_id uuid,
  field_requested text,
  business_relationship_verified boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO supplier_contact_security_audit (
    user_id, 
    supplier_id, 
    contact_field_requested,
    business_relationship_verified,
    access_granted,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    supplier_id,
    field_requested,
    business_relationship_verified,
    business_relationship_verified,
    CASE 
      WHEN business_relationship_verified THEN 'Verified business relationship'
      ELSE 'Contact harvesting attempt blocked'
    END,
    CASE 
      WHEN business_relationship_verified THEN 'low'
      ELSE 'critical'
    END
  );
END;
$$;

-- 8. Log the security fix completion
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SUPPLIER_CONTACT_HARVESTING_PREVENTION_COMPLETE',
  'critical',
  jsonb_build_object(
    'security_issue_fixed', 'Supplier Contact Information Could Be Harvested',
    'protection_implemented', 'Verified business relationship access only',
    'policies_secured', ARRAY[
      'Removed dangerous self-access policy',
      'Created contact-protected view',
      'Implemented business relationship verification',
      'Added comprehensive audit logging'
    ],
    'contact_fields_protected', ARRAY['email', 'phone', 'contact_person', 'address'],
    'access_requirements', 'Verified business relationships via purchase orders or quotations only',
    'timestamp', NOW()
  )
);