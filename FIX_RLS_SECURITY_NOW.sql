-- ============================================================================
-- 🔒 URGENT SECURITY FIX - RUN THIS IN SUPABASE SQL EDITOR NOW
-- ============================================================================
-- Go to: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/sql/new
-- Paste this ENTIRE script and click RUN
-- ============================================================================

-- Enable RLS on admin_material_images
ALTER TABLE public.admin_material_images ENABLE ROW LEVEL SECURITY;

-- Enable RLS on materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS ENABLED - SECURE' ELSE '❌ RLS DISABLED - INSECURE' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('admin_material_images', 'materials')
ORDER BY tablename;

-- Show success message
SELECT '🔒 SECURITY FIX COMPLETE! Both tables now have RLS enabled.' as result;



