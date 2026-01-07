-- FIX USER_ROLES RLS POLICIES
-- This script ensures users can read their own role from the user_roles table

-- First, ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "Allow users to read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;

-- Create a simple policy that allows users to read their own role
CREATE POLICY "user_roles_read_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow inserting roles (for registration process)
CREATE POLICY "user_roles_insert_own"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own role
CREATE POLICY "user_roles_update_own"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify the policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';

