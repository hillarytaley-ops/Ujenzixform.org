-- ============================================================================
-- ADMIN APPROVE/REJECT DELIVERY PROVIDER FUNCTION
-- This creates a secure RPC function for admins to update delivery provider status
-- without exposing service role keys in the frontend
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.admin_update_delivery_provider_status(uuid, text, text);

-- Create the admin function to update delivery provider registration status
CREATE OR REPLACE FUNCTION public.admin_update_delivery_provider_status(
  registration_id uuid,
  new_status text,
  admin_notes_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
  v_registration_exists boolean;
BEGIN
  -- Get the current user's ID
  v_admin_id := auth.uid();
  
  -- Check if caller is authenticated
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Check if user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  END IF;
  
  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected', 'under_review') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status. Must be: pending, approved, rejected, or under_review'
    );
  END IF;
  
  -- Check if registration exists
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_provider_registrations WHERE id = registration_id
  ) INTO v_registration_exists;
  
  IF NOT v_registration_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registration not found'
    );
  END IF;
  
  -- Update the registration
  UPDATE public.delivery_provider_registrations
  SET 
    status = new_status,
    reviewed_at = now(),
    reviewed_by = v_admin_id,
    admin_notes = COALESCE(admin_notes_text, admin_notes),
    updated_at = now()
  WHERE id = registration_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Status updated successfully',
    'registration_id', registration_id,
    'new_status', new_status
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users (function itself checks admin role)
GRANT EXECUTE ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) TO authenticated;

-- Also ensure admin_notes column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_provider_registrations' 
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.delivery_provider_registrations 
    ADD COLUMN admin_notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_provider_registrations' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.delivery_provider_registrations 
    ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_provider_registrations' 
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.delivery_provider_registrations 
    ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

-- Comment
COMMENT ON FUNCTION public.admin_update_delivery_provider_status IS 
'Secure RPC function for admins to approve/reject delivery provider registrations';











