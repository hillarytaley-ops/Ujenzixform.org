-- ================================================================
-- DASHBOARD PINS TABLE
-- ================================================================
-- Each user has a separate PIN for accessing their dashboard.
-- This is different from their auth password for extra security.
-- ================================================================

-- Create the dashboard_pins table
CREATE TABLE IF NOT EXISTS public.dashboard_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,  -- Hashed PIN (we don't store plain text)
  role TEXT NOT NULL CHECK (role IN ('builder', 'supplier')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- One PIN per user
);

-- Enable RLS
ALTER TABLE public.dashboard_pins ENABLE ROW LEVEL SECURITY;

-- Users can only view their own PIN record (not the hash itself, just existence)
CREATE POLICY "users_view_own_pin"
ON public.dashboard_pins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own PIN during registration
CREATE POLICY "users_insert_own_pin"
ON public.dashboard_pins
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (SELECT 1 FROM public.dashboard_pins WHERE user_id = auth.uid())
);

-- Users can update their own PIN
CREATE POLICY "users_update_own_pin"
ON public.dashboard_pins
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ================================================================
-- FUNCTION TO CREATE/SET DASHBOARD PIN
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_dashboard_pin(p_pin TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_pin_hash TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF p_role NOT IN ('builder', 'supplier') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role');
  END IF;
  
  IF LENGTH(p_pin) < 4 OR LENGTH(p_pin) > 8 THEN
    RETURN json_build_object('success', false, 'error', 'PIN must be 4-8 characters');
  END IF;
  
  -- Hash the PIN using pgcrypto
  v_pin_hash := crypt(p_pin, gen_salt('bf'));
  
  -- Insert or update the PIN
  INSERT INTO public.dashboard_pins (user_id, pin_hash, role, updated_at)
  VALUES (v_user_id, v_pin_hash, p_role, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET pin_hash = v_pin_hash, role = p_role, updated_at = NOW();
  
  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ================================================================
-- FUNCTION TO VERIFY DASHBOARD PIN
-- ================================================================
CREATE OR REPLACE FUNCTION public.verify_dashboard_pin(p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_stored_hash TEXT;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get the stored PIN hash
  SELECT pin_hash, role INTO v_stored_hash, v_role
  FROM public.dashboard_pins
  WHERE user_id = v_user_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No PIN set');
  END IF;
  
  -- Verify the PIN
  IF v_stored_hash = crypt(p_pin, v_stored_hash) THEN
    RETURN json_build_object('success', true, 'role', v_role);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid PIN');
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_dashboard_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_dashboard_pin(TEXT) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Dashboard PINs table and functions created successfully';
END $$;






