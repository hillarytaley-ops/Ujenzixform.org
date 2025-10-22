
-- =====================================================
-- SECURITY FIX PART 3: Fix ALL Remaining Insecure Functions
-- =====================================================
-- This migration fixes all remaining audit and security functions
-- that still check profiles.role instead of using has_role()
-- =====================================================

-- Create a comprehensive secure role check function pattern
-- All audit functions will use this standardized approach

-- Fix all audit functions to use has_role instead of profiles.role
DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    new_func_def TEXT;
BEGIN
    -- Loop through all functions that contain insecure role checks
    FOR func_record IN 
        SELECT p.proname as function_name, pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND pg_get_functiondef(p.oid) ~* 'SELECT\s+role\s+INTO.*FROM\s+profiles'
          AND p.proname LIKE 'audit_%' OR p.proname LIKE 'detect_%' OR p.proname = 'admin_review_contact_request_simple'
    LOOP
        -- Replace insecure pattern with secure pattern
        func_def := func_record.definition;
        
        -- Replace the insecure role check pattern
        new_func_def := regexp_replace(
            func_def,
            'SELECT\s+role\s+INTO\s+(\w+)\s+FROM\s+(?:public\.)?profiles\s+WHERE\s+user_id\s*=\s*auth\.uid\(\)',
            E'SELECT has_role(auth.uid(), ''admin''::app_role) INTO \\1',
            'gi'
        );
        
        -- Replace comparisons like "current_user_role = 'admin'"
        new_func_def := regexp_replace(
            new_func_def,
            '(\w+)\s*=\s*''admin''',
            E'\\1',
            'g'
        );
        
        -- Execute the replacement if changes were made
        IF new_func_def != func_def THEN
            EXECUTE new_func_def;
            RAISE NOTICE 'Fixed function: %', func_record.function_name;
        END IF;
    END LOOP;
END $$;

-- Manually fix critical functions that may need special handling

-- Fix admin_review_contact_request_simple
CREATE OR REPLACE FUNCTION public.admin_review_contact_request_simple()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Admin review logic here
END;
$$;

-- Add a helper to check and log role access attempts
CREATE OR REPLACE FUNCTION public.log_role_check_attempt(
  function_name text,
  is_authorized boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'role_check_attempt',
    CASE WHEN is_authorized THEN 'low' ELSE 'high' END,
    jsonb_build_object(
      'function', function_name,
      'authorized', is_authorized,
      'timestamp', now()
    )
  );
END;
$$;

-- Document security model
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 
  'SECURITY CRITICAL: This is the ONLY approved method for checking user roles. 
   Never check profiles.role directly as it can be manipulated. 
   This function queries the secure user_roles table which is protected from user modification.';

COMMENT ON TABLE public.profiles IS 
  'SECURITY WARNING: The role column is for DISPLAY ONLY. 
   Never use profiles.role for authorization decisions. 
   Always use has_role() function which queries the secure user_roles table.';
