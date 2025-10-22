-- Drop existing policies with explicit names
DROP POLICY IF EXISTS "delivery_providers_admin_only_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_ultra_secure_admin_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_self_access_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_self_update_limited" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_public_total_lockdown" ON public.delivery_providers_public;
DROP POLICY IF EXISTS "delivery_providers_public_complete_lockdown" ON public.delivery_providers_public;

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

-- Create audit table for provider contact access monitoring (if not exists)
CREATE TABLE IF NOT EXISTS public.provider_contact_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider_id UUID,
  contact_field_requested TEXT NOT NULL,
  access_granted BOOLEAN DEFAULT FALSE,
  business_relationship_verified BOOLEAN DEFAULT FALSE,
  access_justification TEXT,
  security_risk_level TEXT DEFAULT 'medium',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE public.provider_contact_security_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on audit table if they exist
DROP POLICY IF EXISTS "provider_contact_audit_admin_only" ON public.provider_contact_security_audit;
DROP POLICY IF EXISTS "provider_contact_audit_system_insert" ON public.provider_contact_security_audit;

-- Only admins can view audit logs
CREATE POLICY "provider_contact_audit_admin_only" 
ON public.provider_contact_security_audit
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- System can insert audit logs
CREATE POLICY "provider_contact_audit_system_insert" 
ON public.provider_contact_security_audit
FOR INSERT 
TO authenticated
WITH CHECK (TRUE);