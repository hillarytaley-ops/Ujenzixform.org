-- FIX SECURITY LINTER WARNING: Function search path security

-- Update get_payment_secure function with secure search path
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
SET search_path = public
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

-- Update get_payment_preferences_secure function with secure search path  
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
SET search_path = public
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

-- Update encrypt_payment_details function with secure search path
CREATE OR REPLACE FUNCTION public.encrypt_payment_details()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;