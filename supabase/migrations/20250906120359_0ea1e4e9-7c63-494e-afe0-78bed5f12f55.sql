-- EMERGENCY FIX: Resolve infinite recursion in profiles table RLS policies
-- Step 1: Drop ALL existing policies on profiles table that cause recursion

DROP POLICY IF EXISTS "emergency_profiles_privacy_protection" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile_only" ON profiles;
DROP POLICY IF EXISTS "users_create_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_only_profile_deletion" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "emergency_profiles_lockdown" ON profiles;

-- Step 2: Drop problematic security definer functions that query profiles
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_builder();
DROP FUNCTION IF EXISTS public.is_supplier();

-- Step 3: Create simple, non-recursive policies using auth.uid() directly

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

-- Step 4: Create admin access table to avoid recursion
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow admin users to view admin_users table
CREATE POLICY "admin_users_select" 
ON admin_users 
FOR SELECT
USING (user_id = auth.uid());

-- Step 5: Create non-recursive admin access function
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

-- Step 6: Add admin access policy for profiles using the new function
CREATE POLICY "admin_profile_access" 
ON profiles 
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Step 7: Re-create essential functions without profile table recursion
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 8: Update get_secure_profile_info to avoid recursion
CREATE OR REPLACE FUNCTION public.get_secure_profile_info(profile_uuid uuid)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    full_name text,
    role text,
    user_type text,
    is_professional boolean,
    created_at timestamp with time zone,
    can_view_contact boolean,
    phone text,
    email text,
    company_name text,
    business_license text,
    security_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_profile_record profiles%ROWTYPE;
    current_user_id uuid := auth.uid();
    can_access_contact BOOLEAN := FALSE;
    business_relationship_exists BOOLEAN := FALSE;
BEGIN
    -- Early exit if not authenticated
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get target profile
    SELECT * INTO target_profile_record 
    FROM profiles 
    WHERE profiles.id = profile_uuid;
    
    IF target_profile_record.id IS NULL THEN
        RETURN;
    END IF;
    
    -- Determine access level WITHOUT querying profiles table for current user role
    IF public.is_admin_user() THEN
        can_access_contact := TRUE;
    ELSIF target_profile_record.user_id = current_user_id THEN
        can_access_contact := TRUE; -- User accessing own profile
    ELSE
        -- Check for business relationship via direct table queries
        SELECT EXISTS (
            SELECT 1 FROM purchase_orders po
            JOIN suppliers s ON s.id = po.supplier_id
            WHERE s.user_id = target_profile_record.user_id
            AND po.buyer_id IN (
                SELECT id FROM profiles WHERE user_id = current_user_id
            )
            AND po.status IN ('confirmed', 'processing', 'shipped', 'delivered')
            AND po.created_at > NOW() - INTERVAL '90 days'
        ) INTO business_relationship_exists;
        
        can_access_contact := business_relationship_exists;
    END IF;
    
    -- Log access attempt
    INSERT INTO profile_access_log (
        viewer_user_id, viewed_profile_id, access_type
    ) VALUES (
        current_user_id, profile_uuid, 
        CASE WHEN can_access_contact THEN 'authorized_profile_view' ELSE 'restricted_profile_view' END
    );
    
    -- Return protected profile data
    RETURN QUERY SELECT
        target_profile_record.id,
        target_profile_record.user_id,
        target_profile_record.full_name,
        target_profile_record.role,
        target_profile_record.user_type,
        target_profile_record.is_professional,
        target_profile_record.created_at,
        can_access_contact,
        CASE WHEN can_access_contact THEN target_profile_record.phone ELSE NULL END,
        CASE WHEN can_access_contact THEN target_profile_record.email ELSE NULL END,
        CASE WHEN can_access_contact THEN target_profile_record.company_name ELSE 'Contact via platform' END,
        CASE WHEN can_access_contact THEN target_profile_record.business_license ELSE NULL END,
        CASE 
            WHEN can_access_contact THEN 'Full profile access authorized'
            ELSE 'Contact information protected - business relationship required'
        END;
END;
$$;