-- EMERGENCY FIX: Resolve infinite recursion in profiles table RLS policies
-- Step 1: Get all existing policy names and drop them systematically

-- Drop ALL policies on profiles table (using more comprehensive approach)
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Drop problematic security definer functions that cause recursion
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_builder();
DROP FUNCTION IF EXISTS public.is_supplier();

-- Step 3: Create admin access table to avoid recursion (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users' AND table_schema = 'public') THEN
        CREATE TABLE admin_users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at timestamp with time zone DEFAULT now(),
            UNIQUE(user_id)
        );
        
        -- Enable RLS on admin_users
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        
        -- Policy for admin_users table
        CREATE POLICY "admin_users_select" 
        ON admin_users 
        FOR SELECT
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Step 4: Create non-recursive admin access function
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

-- Step 5: Create simple, non-recursive policies using auth.uid() directly

-- Allow users to view their own profile only
CREATE POLICY "users_own_profile_select" 
ON profiles 
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to update their own profile only
CREATE POLICY "users_own_profile_update" 
ON profiles 
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow profile creation during signup
CREATE POLICY "users_create_profile" 
ON profiles 
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add admin access policy for profiles using the new function
CREATE POLICY "admin_profile_access" 
ON profiles 
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Step 6: Re-create essential functions without profile table recursion
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;