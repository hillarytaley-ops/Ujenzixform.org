-- ============================================================================
-- VERIFICATION SCRIPT FOR MATERIALGRID TABLES
-- ============================================================================
-- Run this in Supabase SQL Editor to verify all required tables exist
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ============================================================================

-- 1. Check if admin_material_images table exists
SELECT 
  'admin_material_images' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_material_images'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check if materials table exists
SELECT 
  'materials' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'materials'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 3. Check if approval_status column exists in materials
SELECT 
  'materials.approval_status' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' AND column_name = 'approval_status'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run migration 20251227_add_approval_status_to_materials.sql' END as status;

-- 4. Check admin_material_images columns
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'admin_material_images'
ORDER BY ordinal_position;

-- 5. Check materials columns
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'materials'
ORDER BY ordinal_position;

-- 6. Count records in each table
SELECT 'admin_material_images' as table_name, COUNT(*) as record_count 
FROM admin_material_images
UNION ALL
SELECT 'materials' as table_name, COUNT(*) as record_count 
FROM materials;

-- 7. Check approval status distribution in materials
SELECT 
  COALESCE(approval_status, 'NULL/not set') as approval_status,
  COUNT(*) as count
FROM materials
GROUP BY approval_status;



