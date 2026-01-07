-- ================================================================
-- FUNCTION TO ASSIGN USER ROLE (BYPASSES RLS)
-- ================================================================
-- This function allows users to assign themselves a role during
-- registration. It uses SECURITY DEFINER to bypass RLS restrictions.
-- 
-- Security measures:
-- 1. Can only assign role to the calling user (auth.uid())
-- 2. Can only assign 'builder' or 'supplier' roles (not 'admin')
-- 3. Will fail if user already has a role
-- ================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.assign_user_role(TEXT);

-- Create the function
CREATE OR REPLACE FUNCTION public.assign_user_role(p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_existing_role TEXT;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Validate role - only allow builder or supplier
  IF p_role NOT IN ('builder', 'supplier') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Must be builder or supplier.'
    );
  END IF;
  
  -- Check if user already has a role
  SELECT role INTO v_existing_role
  FROM public.user_roles
  WHERE user_id = v_user_id;
  
  IF v_existing_role IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already has a role assigned: ' || v_existing_role,
      'existing_role', v_existing_role
    );
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (v_user_id, p_role, NOW());
  
  RETURN json_build_object(
    'success', true,
    'role', p_role,
    'user_id', v_user_id
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition - role was inserted between check and insert
    SELECT role INTO v_existing_role
    FROM public.user_roles
    WHERE user_id = v_user_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Role already exists',
      'existing_role', v_existing_role
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_user_role(TEXT) TO authenticated;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'assign_user_role'
  ) THEN
    RAISE NOTICE 'Function assign_user_role created successfully';
  ELSE
    RAISE EXCEPTION 'Function assign_user_role was not created!';
  END IF;
END $$;






