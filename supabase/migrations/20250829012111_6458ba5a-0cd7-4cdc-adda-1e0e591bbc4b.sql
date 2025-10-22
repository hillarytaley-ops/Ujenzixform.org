-- Create secure delivery data access functions for privacy protection

-- Update delivery RLS policies for better security
DROP POLICY IF EXISTS "Builders can create their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Suppliers can update status of their deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "System admin full access for maintenance" ON public.deliveries;

-- More restrictive delivery access policies
CREATE POLICY "Secure delivery access for authorized users"
ON public.deliveries 
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can see all deliveries
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Builders can see their own deliveries
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = deliveries.builder_id) OR
    -- Suppliers can see deliveries they're involved with
    EXISTS (SELECT 1 FROM profiles p JOIN suppliers s ON s.user_id = p.id 
            WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id)
  )
);

CREATE POLICY "Builders can create secure deliveries"
ON public.deliveries
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = deliveries.builder_id AND role IN ('builder', 'admin'))
);

CREATE POLICY "Authorized users can update delivery status"
ON public.deliveries
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can update any delivery
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Suppliers can update status of their deliveries
    EXISTS (SELECT 1 FROM profiles p JOIN suppliers s ON s.user_id = p.id 
            WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id)
  )
);

-- Enhanced delivery request policies
DROP POLICY IF EXISTS "Builders can create delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Limited status updates for authorized parties" ON public.delivery_requests;
DROP POLICY IF EXISTS "Admin maintenance access only" ON public.delivery_requests;

CREATE POLICY "Secure delivery request creation"
ON public.delivery_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = delivery_requests.builder_id AND role IN ('builder', 'admin'))
);

CREATE POLICY "Secure delivery request viewing"
ON public.delivery_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can see all requests
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Builders can see their own requests
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = delivery_requests.builder_id) OR
    -- Providers can see assigned requests
    EXISTS (SELECT 1 FROM profiles p JOIN delivery_providers dp ON dp.user_id = p.id
            WHERE p.user_id = auth.uid() AND dp.id = delivery_requests.provider_id)
  )
);

CREATE POLICY "Secure delivery request updates"
ON public.delivery_requests
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can update any request
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Builders can update their own requests (limited fields)
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = delivery_requests.builder_id) OR
    -- Providers can update assigned requests (status only)
    EXISTS (SELECT 1 FROM profiles p JOIN delivery_providers dp ON dp.user_id = p.id
            WHERE p.user_id = auth.uid() AND dp.id = delivery_requests.provider_id)
  )
);

-- Create audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.delivery_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  sensitive_fields_accessed text[],
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.delivery_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin access to delivery audit logs"
ON public.delivery_access_log
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_delivery_access(
  action_param text,
  resource_type_param text,
  resource_id_param uuid DEFAULT NULL,
  fields_param text[] DEFAULT ARRAY[]::text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO delivery_access_log (
    user_id,
    action,
    resource_type,
    resource_id,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(),
    action_param,
    resource_type_param,
    resource_id_param,
    fields_param
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail on logging errors
  NULL;
END;
$$;