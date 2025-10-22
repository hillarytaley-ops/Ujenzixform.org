-- Fix suppliers table ultra-strict security and remove trigger error
-- Drop the problematic trigger
DROP TRIGGER IF EXISTS cleanup_expired_verifications_trigger ON supplier_business_verification;

-- Update the cleanup function to be called manually instead of via trigger
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications_manual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark expired verifications as inactive instead of deleting for audit trail
  UPDATE supplier_business_verification
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
  
  -- Log cleanup for audit
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    null, null, 'verification_cleanup_manual',
    false, 'Manual cleanup of expired business verifications', 'low'
  );
END;
$$;

-- Ensure suppliers table has the strictest possible RLS policy
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Verify suppliers_absolute_admin_only_2024 policy exists
-- If not, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'suppliers' 
    AND policyname = 'suppliers_absolute_admin_only_2024'
  ) THEN
    CREATE POLICY "suppliers_absolute_admin_only_2024" 
    ON public.suppliers 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin'
      )
    ) 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;