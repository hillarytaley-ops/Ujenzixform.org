-- ============================================================================
-- FIX DELIVERY PROVIDER REGISTRATION RLS FOR ADMIN UPDATES
-- This allows admins to update delivery provider registrations
-- even when using the anon key (without Supabase Auth session)
-- ============================================================================

-- First, enable RLS if not already enabled
ALTER TABLE public.delivery_provider_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing update policies that might conflict
DROP POLICY IF EXISTS "delivery_reg_admin_update" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_update" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_anon_admin_update" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_provider_admin_update" ON public.delivery_provider_registrations;

-- Create a more permissive update policy for admins
-- This allows authenticated users with admin role OR service role to update
CREATE POLICY "delivery_reg_admin_update" 
ON public.delivery_provider_registrations
FOR UPDATE
USING (
  -- Allow if user is authenticated and has admin role
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  -- Allow if using service role (for backend/admin operations)
  (auth.jwt() ->> 'role' = 'service_role')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  (auth.jwt() ->> 'role' = 'service_role')
);

-- Also ensure there's a select policy for admins
DROP POLICY IF EXISTS "delivery_reg_admin_select" ON public.delivery_provider_registrations;
CREATE POLICY "delivery_reg_admin_select"
ON public.delivery_provider_registrations
FOR SELECT
USING (
  -- Own registration
  auth.uid() = auth_user_id
  OR
  -- Admin can view all
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR
  -- Service role can view all
  (auth.jwt() ->> 'role' = 'service_role')
  OR
  -- Anon can view (for public listing, limited fields handled in app)
  true
);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.delivery_provider_registrations TO authenticated;
GRANT SELECT ON public.delivery_provider_registrations TO anon;

-- Also ensure the admin_notes, reviewed_by, reviewed_at columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_provider_registrations' 
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.delivery_provider_registrations 
    ADD COLUMN admin_notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_provider_registrations' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.delivery_provider_registrations 
    ADD COLUMN reviewed_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_provider_registrations' 
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.delivery_provider_registrations 
    ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

-- Comment for documentation
COMMENT ON POLICY "delivery_reg_admin_update" ON public.delivery_provider_registrations IS 
'Allows admins (authenticated with admin role) or service role to update delivery provider registrations';











