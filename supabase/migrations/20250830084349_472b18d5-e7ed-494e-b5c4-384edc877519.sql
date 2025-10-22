-- Fix the policy conflict and complete driver contact security
-- Drop all existing delivery policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view basic delivery information" ON public.deliveries;
DROP POLICY IF EXISTS "Authorized users can update delivery status" ON public.deliveries;
DROP POLICY IF EXISTS "Builders can create secure deliveries" ON public.deliveries;

-- Create new comprehensive policies with driver contact protection
CREATE POLICY "Authorized users can view basic delivery info" 
ON public.deliveries 
FOR SELECT 
TO authenticated
USING (
  -- Users can see delivery details but driver contact is controlled by secure functions
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND id = deliveries.builder_id
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id
    )
  )
);

-- Policy for creating deliveries
CREATE POLICY "Builders can create deliveries" 
ON public.deliveries 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND id = deliveries.builder_id
    )
  )
);

-- Policy for updating delivery status (admins and suppliers only)
CREATE POLICY "Authorized users can update delivery status" 
ON public.deliveries 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id
    )
  )
);

-- Create enhanced audit table for driver contact access
CREATE TABLE IF NOT EXISTS public.driver_contact_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  delivery_id uuid REFERENCES public.deliveries(id),
  access_type text NOT NULL,
  delivery_status text,
  user_role text,
  authorized boolean NOT NULL DEFAULT false,
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  business_justification text
);

-- Enable RLS on the audit log
ALTER TABLE public.driver_contact_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view driver contact access logs
CREATE POLICY "Admin can view driver contact access logs"
ON public.driver_contact_access_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);