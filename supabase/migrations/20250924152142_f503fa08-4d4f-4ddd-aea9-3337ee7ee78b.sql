-- Check for and fix any remaining security definer views
-- First, let's check what views have security definer
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');

-- Drop any problematic security definer views and replace with secure functions
-- The issue might be from existing views, let's ensure all views are clean

-- Remove security definer from any existing problematic views
-- Let's check if there are any other views that might have this issue