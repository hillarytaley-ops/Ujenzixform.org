-- First, completely drop all existing policies on both tables
DO $$ 
BEGIN
  -- Drop all policies on delivery_providers
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'delivery_providers' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.delivery_providers';
  END LOOP;
  
  -- Drop all policies on delivery_providers_public
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'delivery_providers_public' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.delivery_providers_public';
  END LOOP;
END $$;

-- Create ultra-strict RLS policies for delivery_providers table
-- CRITICAL: This table contains sensitive contact information

-- Admin-only access to full delivery provider data
CREATE POLICY "delivery_providers_ultra_secure_admin_access" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Providers can only access their own data
CREATE POLICY "delivery_providers_self_access_only" 
ON public.delivery_providers
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
);

-- Providers can only update their own data
CREATE POLICY "delivery_providers_self_update_limited" 
ON public.delivery_providers
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
);

-- Completely lock down delivery_providers_public table
CREATE POLICY "delivery_providers_public_complete_lockdown" 
ON public.delivery_providers_public
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);