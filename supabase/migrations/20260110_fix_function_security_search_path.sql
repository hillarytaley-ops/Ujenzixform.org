-- =============================================
-- Fix Function Security - Add SET search_path to All SECURITY DEFINER Functions
-- Target: 193 Function Security warnings
-- Expected result: Reduce function security warnings significantly
-- =============================================

-- This migration adds SET search_path = public to all SECURITY DEFINER functions
-- to prevent search_path injection attacks

DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
  search_path_set BOOLEAN;
BEGIN
  -- Loop through all SECURITY DEFINER functions in public schema
  FOR func_record IN
    SELECT 
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as func_args,
      p.oid as func_oid,
      pg_get_functiondef(p.oid) as func_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
      AND p.proname NOT LIKE 'pg_%'  -- Exclude PostgreSQL system functions
  LOOP
    BEGIN
      -- Check if function already has SET search_path
      search_path_set := func_record.func_def LIKE '%SET search_path%';
      
      IF NOT search_path_set THEN
        -- Build function signature for ALTER FUNCTION
        IF func_record.func_args IS NULL OR func_record.func_args = '' THEN
          func_signature := func_record.func_name;
        ELSE
          func_signature := func_record.func_name || '(' || func_record.func_args || ')';
        END IF;
        
        -- Use ALTER FUNCTION to set search_path
        -- This works for most function types
        BEGIN
          EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', func_signature);
          RAISE NOTICE 'Fixed search_path for function: %', func_signature;
        EXCEPTION WHEN OTHERS THEN
          -- If ALTER FUNCTION doesn't work, try with schema qualification
          BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
              func_record.func_name, 
              COALESCE(func_record.func_args, ''));
            RAISE NOTICE 'Fixed search_path for function: % (with schema)', func_record.func_name;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix function %: % (may need manual recreation)', 
              func_record.func_name, SQLERRM;
          END;
        END;
      ELSE
        RAISE NOTICE 'Function % already has search_path set', func_record.func_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing function %: %', func_record.func_name, SQLERRM;
      -- Continue with next function
    END;
  END LOOP;
END $$;

-- Note: ALTER FUNCTION ... SET search_path works for most functions
-- Some functions may need to be manually recreated if ALTER doesn't work
-- This migration fixes the majority of functions automatically
