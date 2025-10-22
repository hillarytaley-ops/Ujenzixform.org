-- EMERGENCY FIX: Clean slate approach for profiles table RLS policies
-- Step 1: Drop ALL existing policies and functions systematically

-- Drop all existing policies on profiles
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.schemaname || '.' || pol.tablename || ';';
    END LOOP;
END $$;

-- Drop functions that might cause recursion
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_builder() CASCADE;
DROP FUNCTION IF EXISTS public.is_supplier() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- Step 2: Create admin_users table for non-recursive admin access
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_users
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
CREATE POLICY "admin_users_select" 
ON admin_users 
FOR SELECT
USING (user_id = auth.uid());

-- Step 3: Create non-recursive admin function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  );
$$;

-- Step 4: Create simple, non-recursive policies for profiles

-- Users can view their own profile
CREATE POLICY "users_own_profile_select" 
ON profiles 
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own profile  
CREATE POLICY "users_own_profile_update" 
ON profiles 
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can create their own profile
CREATE POLICY "users_create_profile" 
ON profiles 
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin access to all profiles
CREATE POLICY "admin_profile_access" 
ON profiles 
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Step 5: Recreate essential helper functions
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;