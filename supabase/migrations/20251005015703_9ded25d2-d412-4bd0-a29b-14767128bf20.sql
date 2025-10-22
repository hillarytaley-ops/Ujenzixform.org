-- CRITICAL SECURITY FIX: Separate roles table to prevent privilege escalation
-- Create role enum only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'builder', 'supplier', 'delivery_provider');
  END IF;
END $$;

-- Create secure user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.user_id, p.role::app_role
FROM public.profiles p
WHERE p.user_id IS NOT NULL 
  AND p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id AND ur.role = p.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Create SECURITY DEFINER function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop all existing policies on profiles
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles CASCADE';
  END LOOP;
END $$;

-- Create strict policies for profiles table
-- Users can ONLY view their own profile
CREATE POLICY "profiles_users_view_own_only"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "profiles_admins_view_all"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can ONLY update their own profile
CREATE POLICY "profiles_users_update_own_only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_admins_update_all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own profile
CREATE POLICY "profiles_users_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can insert any profile
CREATE POLICY "profiles_admins_insert_any"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete profiles
CREATE POLICY "profiles_admins_delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_roles table
DROP POLICY IF EXISTS "user_roles_view_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admins_view_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admins_manage" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "user_roles_view_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "user_roles_admins_view_all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can grant roles
CREATE POLICY "user_roles_admins_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create audit log for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  role_added app_role,
  role_removed app_role,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_audit_admins_only" ON public.role_change_audit;

CREATE POLICY "role_audit_admins_only"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));