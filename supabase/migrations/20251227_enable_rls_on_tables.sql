-- ============================================================================
-- ENABLE RLS ON TABLES - SECURITY FIX
-- ============================================================================
-- Created: December 27, 2025
-- Purpose: Fix security linter errors by enabling RLS on tables that have
--          policies but RLS is not enabled
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON admin_material_images TABLE
-- ============================================================================
ALTER TABLE public.admin_material_images ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'admin_material_images' 
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on admin_material_images';
  END IF;
END $$;

-- ============================================================================
-- 2. ENABLE RLS ON materials TABLE
-- ============================================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'materials' 
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on materials';
  END IF;
END $$;

-- ============================================================================
-- 3. VERIFY EXISTING POLICIES ARE WORKING
-- ============================================================================

-- List all policies on admin_material_images
SELECT 
  'admin_material_images' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'admin_material_images';

-- List all policies on materials
SELECT 
  'materials' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'materials';

-- ============================================================================
-- 4. CONFIRM RLS STATUS
-- ============================================================================
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('admin_material_images', 'materials')
ORDER BY tablename;



