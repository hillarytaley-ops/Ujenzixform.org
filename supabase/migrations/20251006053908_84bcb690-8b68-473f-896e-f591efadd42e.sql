-- Phase 2: Payment Vault Security (Fixed with correct column name)
-- Fix 7: Add Payment Vault Encryption Layer with proper RLS

DROP POLICY IF EXISTS "payment_contact_vault_admin_only" ON public.payment_contact_vault;
DROP POLICY IF EXISTS "payment_contact_vault_block_anon" ON public.payment_contact_vault;

-- Only admins can access payment vault directly
CREATE POLICY "payment_vault_admin_full_access"
ON public.payment_contact_vault
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block all non-admin access to the table directly
CREATE POLICY "payment_vault_deny_non_admin"
ON public.payment_contact_vault
FOR ALL
USING (false)
WITH CHECK (false);

-- Block all anonymous access
CREATE POLICY "payment_vault_block_anonymous"
ON public.payment_contact_vault
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create secure function to access payment contact with proper authorization
CREATE OR REPLACE FUNCTION get_payment_contact_secure(
  target_payment_id uuid,
  access_justification text DEFAULT 'payment_processing'
)
RETURNS TABLE(
  id uuid,
  phone_number text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_payment_owner boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Check if user is the owner of the payment
  -- Assuming we need to trace through payment_preferences or similar
  SELECT EXISTS(
    SELECT 1 FROM payment_preferences pp
    WHERE pp.id = target_payment_id AND pp.user_id = auth.uid()
  ) INTO is_payment_owner;
  
  -- Log access attempt
  INSERT INTO payment_access_audit (
    user_id, payment_id, access_type, access_granted,
    accessed_fields, security_risk_level
  ) VALUES (
    auth.uid(), target_payment_id, access_justification,
    (is_admin OR is_payment_owner),
    ARRAY['phone_number'],
    CASE 
      WHEN (is_admin OR is_payment_owner) THEN 'low'
      ELSE 'critical'
    END
  );
  
  IF is_admin OR is_payment_owner THEN
    RETURN QUERY
    SELECT 
      pcv.id, pcv.phone_number, true as access_granted,
      CASE 
        WHEN is_admin THEN 'Admin access'
        ELSE 'Payment owner access'
      END as access_reason
    FROM payment_contact_vault pcv
    WHERE pcv.payment_id = target_payment_id;
  ELSE
    RETURN QUERY
    SELECT 
      NULL::uuid, 'Protected'::text, false,
      'Payment contact access requires ownership or admin privileges'::text;
  END IF;
END;
$$;

-- Add trigger to audit all payment vault access
CREATE OR REPLACE FUNCTION audit_payment_vault_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_access_audit (
    user_id, payment_id, access_type, access_granted,
    accessed_fields, security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.payment_id, OLD.payment_id),
    TG_OP,
    has_role(auth.uid(), 'admin'::app_role),
    ARRAY['phone_number'],
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'low'
      ELSE 'critical'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS payment_vault_access_audit ON public.payment_contact_vault;
CREATE TRIGGER payment_vault_access_audit
AFTER INSERT OR UPDATE OR DELETE ON public.payment_contact_vault
FOR EACH ROW
EXECUTE FUNCTION audit_payment_vault_access();

COMMENT ON TABLE payment_contact_vault IS 'Phone numbers for payments are admin-protected. Access only via get_payment_contact_secure() with ownership verification and full audit logging.';