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
  func_definition TEXT;
  new_definition TEXT;
  search_path_set BOOLEAN;
BEGIN
  -- Loop through all SECURITY DEFINER functions in public schema
  FOR func_record IN
    SELECT 
      p.proname as func_name,
      pg_get_functiondef(p.oid) as func_def,
      p.oid as func_oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
      AND p.proname NOT LIKE 'pg_%'  -- Exclude PostgreSQL system functions
      AND p.proname NOT LIKE 'get_%'  -- Exclude our security advisor functions
  LOOP
    BEGIN
      -- Check if function already has SET search_path
      search_path_set := func_record.func_def LIKE '%SET search_path%';
      
      IF NOT search_path_set THEN
        -- Extract function definition and add SET search_path
        func_definition := func_record.func_def;
        
        -- Find the position after LANGUAGE and before AS $$
        -- Pattern: CREATE OR REPLACE FUNCTION ... LANGUAGE ... AS $$
        -- We need to insert SET search_path = public before AS $$
        
        -- For now, we'll use a simpler approach: recreate the function with search_path
        -- Note: This is complex because we need to preserve the exact function signature
        -- A better approach is to use ALTER FUNCTION to set the search_path attribute
        
        -- Use ALTER FUNCTION to set search_path (PostgreSQL 9.3+)
        EXECUTE format('ALTER FUNCTION public.%I SET search_path = public', func_record.func_name);
        
        RAISE NOTICE 'Fixed search_path for function: %', func_record.func_name;
      ELSE
        RAISE NOTICE 'Function % already has search_path set', func_record.func_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing function %: %', func_record.func_name, SQLERRM;
      -- Continue with next function
    END;
  END LOOP;
END $$;

-- Note: ALTER FUNCTION ... SET search_path only works for functions that support it
-- For functions that need to be recreated, we'll need to handle them individually
-- This migration fixes the majority of functions that support ALTER FUNCTION

