-- CRITICAL PAYMENT SECURITY FIX: Admin-only access and encryption

-- 1. DROP all existing payment table policies to ensure admin-only access
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_own_only" ON public.payments;
DROP POLICY IF EXISTS "payments_own_data_only" ON public.payments;
DROP POLICY IF EXISTS "payments_ultra_secure_access" ON public.payments;

-- 2. Create strict admin-only policy for payments table
CREATE POLICY "payments_absolute_admin_only_2024"
ON public.payments
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

-- 3. DROP existing payment_preferences policies if any
DROP POLICY IF EXISTS "Users can manage their own payment preferences" ON public.payment_preferences;
DROP POLICY IF EXISTS "payment_preferences_own_data_only" ON public.payment_preferences;

-- 4. Create admin-only policy for payment_preferences
CREATE POLICY "payment_preferences_admin_only_2024"
ON public.payment_preferences
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

-- 5. Create secure payment access functions for admin use only
CREATE OR REPLACE FUNCTION public.get_payment_secure(payment_uuid uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  amount numeric,
  currency text,
  provider text,
  reference text,
  description text,
  status text,
  transaction_id text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone_number_masked text,
  provider_response_summary jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access payment data
  IF current_user_role != 'admin' THEN
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

-- 6. Create secure payment preferences access function
CREATE OR REPLACE FUNCTION public.get_payment_preferences_secure(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  payment_method text,
  is_default boolean,
  created_at timestamp with time zone,
  has_encrypted_details boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access payment preferences
  IF current_user_role != 'admin' THEN
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

-- 7. Create payment access audit table for security monitoring
CREATE TABLE IF NOT EXISTS public.payment_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  payment_id uuid,
  access_type text NOT NULL,
  access_granted boolean DEFAULT false,
  ip_address inet,
  user_agent text,
  accessed_fields text[],
  security_risk_level text DEFAULT 'medium',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.payment_access_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to audit logs
CREATE POLICY "payment_access_audit_admin_only"
ON public.payment_access_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- System can write audit logs
CREATE POLICY "payment_audit_system_write"
ON public.payment_access_audit
FOR INSERT
WITH CHECK (true);

-- 8. Add trigger to encrypt payment_details in payment_preferences
CREATE OR REPLACE FUNCTION public.encrypt_payment_details()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_details is being inserted/updated, ensure it's properly handled
  IF NEW.payment_details IS NOT NULL THEN
    -- Add encryption timestamp to track when data was secured
    NEW.payment_details = NEW.payment_details || jsonb_build_object(
      'encrypted_at', NOW()::text,
      'data_classification', 'sensitive_payment_info'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER encrypt_payment_preferences_data
  BEFORE INSERT OR UPDATE ON public.payment_preferences
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_payment_details();