-- EMERGENCY SECURITY FIX - Critical vulnerabilities in delivery_providers and profiles tables
-- Fix 1: Secure delivery_providers table - restrict all access to provider self and admin only

-- Ensure delivery_providers table has the most restrictive policy
DROP POLICY IF EXISTS "delivery_providers_secure_access" ON delivery_providers;

CREATE POLICY "emergency_delivery_providers_lockdown" 
ON delivery_providers 
FOR ALL
USING (
  -- Only allow provider themselves or admin
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
);

-- Fix 2: Secure profiles table - CRITICAL privacy fix
-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "emergency_profiles_lockdown" ON profiles;

-- Create ultra-restrictive profile access policy
CREATE POLICY "emergency_profiles_privacy_protection" 
ON profiles 
FOR SELECT
USING (
  -- User can only see their own profile OR admin can see all
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile_only" 
ON profiles 
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow profile creation during signup
CREATE POLICY "users_create_own_profile" 
ON profiles 
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Block profile deletion except by admin
CREATE POLICY "admin_only_profile_deletion" 
ON profiles 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Fix 3: Create secure profile viewing function for business relationships
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
    user_profile_record profiles%ROWTYPE;
    target_profile_record profiles%ROWTYPE;
    can_access_contact BOOLEAN := FALSE;
    business_relationship_exists BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF user_profile_record.user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get target profile
    SELECT * INTO target_profile_record 
    FROM profiles 
    WHERE profiles.id = profile_uuid;
    
    IF target_profile_record.id IS NULL THEN
        RETURN;
    END IF;
    
    -- Determine access level
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := TRUE;
    ELSIF user_profile_record.id = target_profile_record.id THEN
        can_access_contact := TRUE; -- User accessing own profile
    ELSIF user_profile_record.role = 'builder' AND target_profile_record.role = 'supplier' THEN
        -- Check for active business relationship via purchase orders
        SELECT EXISTS (
            SELECT 1 FROM purchase_orders po
            JOIN suppliers s ON s.id = po.supplier_id
            WHERE po.buyer_id = user_profile_record.id 
            AND s.user_id = target_profile_record.id
            AND po.status IN ('confirmed', 'processing', 'shipped', 'delivered')
            AND po.created_at > NOW() - INTERVAL '90 days'
        ) INTO business_relationship_exists;
        
        can_access_contact := business_relationship_exists;
    END IF;
    
    -- Log access attempt
    INSERT INTO profile_access_log (
        viewer_user_id, viewed_profile_id, access_type
    ) VALUES (
        auth.uid(), profile_uuid, 
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