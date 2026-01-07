-- ===================================================================
-- FIX BUILDER REGISTRATION - Run this in Supabase SQL Editor
-- ===================================================================
-- This script ensures the builder_registrations table exists and has
-- the correct RLS policies for users to register.
-- ===================================================================

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.builder_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT,
  business_registration_number TEXT,
  nca_license_number TEXT,
  kra_pin TEXT,
  county TEXT NOT NULL DEFAULT 'Not specified',
  town TEXT,
  physical_address TEXT,
  builder_type TEXT NOT NULL DEFAULT 'individual',
  builder_category TEXT NOT NULL DEFAULT 'private',
  years_experience INTEGER DEFAULT 0,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  portfolio_url TEXT,
  insurance_details TEXT,
  project_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  project_timeline TEXT,
  budget_range TEXT,
  project_description TEXT,
  property_type TEXT,
  id_document_url TEXT,
  business_certificate_url TEXT,
  nca_certificate_url TEXT,
  profile_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT true,
  privacy_accepted BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT builder_one_registration_per_user UNIQUE (auth_user_id)
);

-- Step 2: Enable RLS
ALTER TABLE public.builder_registrations ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "builder_reg_authenticated_insert" ON public.builder_registrations;
DROP POLICY IF EXISTS "builder_reg_view_own" ON public.builder_registrations;
DROP POLICY IF EXISTS "builder_reg_user_update_own" ON public.builder_registrations;
DROP POLICY IF EXISTS "builder_reg_admin_view" ON public.builder_registrations;
DROP POLICY IF EXISTS "builder_reg_admin_update" ON public.builder_registrations;

-- Step 4: Create INSERT policy - users can insert their own registration
CREATE POLICY "builder_reg_authenticated_insert"
ON public.builder_registrations
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Step 5: Create SELECT policy - users can view their own registration
CREATE POLICY "builder_reg_view_own"
ON public.builder_registrations
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Step 6: Create UPDATE policy - users can update their own registration
CREATE POLICY "builder_reg_user_update_own"
ON public.builder_registrations
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Step 7: Admin policies
CREATE POLICY "builder_reg_admin_view"
ON public.builder_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "builder_reg_admin_update"
ON public.builder_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Step 8: Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'builder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT user_roles_user_id_unique UNIQUE (user_id)
);

-- Step 9: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 10: Drop existing user_roles policies
DROP POLICY IF EXISTS "user_roles_user_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_select_own" ON public.user_roles;

-- Step 11: Create user_roles policies
CREATE POLICY "user_roles_user_insert_own"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_user_update_own"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_user_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Done! Now try registering again.
SELECT 'SUCCESS: Builder registration tables and policies are ready!' as message;






