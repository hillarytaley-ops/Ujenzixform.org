-- ====================================================
-- FIX SUPABASE SECURITY LINTER ERRORS
-- Created: 2024-12-19
-- Fixes:
--   1. SECURITY DEFINER views (3 views)
--   2. RLS disabled on public tables (7 tables)
-- ====================================================

-- ====================================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- Change views to use SECURITY INVOKER (default, respects RLS of querying user)
-- ====================================================

-- 1.1 Fix camera_directory_safe view
DROP VIEW IF EXISTS public.camera_directory_safe;

CREATE VIEW public.camera_directory_safe 
WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.name,
    COALESCE(split_part(c.location, ',', -1), 'Construction Site') as general_location,
    c.is_active,
    c.camera_type,
    c.project_id,
    CASE WHEN c.stream_url IS NOT NULL THEN true ELSE false END as has_stream
FROM cameras c
WHERE c.is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON public.camera_directory_safe TO authenticated;

-- 1.2 Fix daily_registration_stats view
DROP VIEW IF EXISTS public.daily_registration_stats;

CREATE VIEW public.daily_registration_stats
WITH (security_invoker = true) AS
SELECT 
    DATE(created_at) as registration_date,
    COUNT(*) as total_registrations,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
FROM (
    SELECT created_at, status FROM supplier_applications
    UNION ALL
    SELECT created_at, status FROM delivery_applications
) combined
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

GRANT SELECT ON public.daily_registration_stats TO authenticated;

-- 1.3 Fix registration_summary view
DROP VIEW IF EXISTS public.registration_summary;

CREATE VIEW public.registration_summary
WITH (security_invoker = true) AS
SELECT 
    'suppliers' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM supplier_applications
UNION ALL
SELECT 
    'delivery_providers' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM delivery_applications;

GRANT SELECT ON public.registration_summary TO authenticated;

-- ====================================================
-- PART 2: ENABLE RLS ON TABLES WITHOUT IT
-- ====================================================

-- 2.1 notification_templates - Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "notification_templates_select_all" ON public.notification_templates;
DROP POLICY IF EXISTS "notification_templates_admin_all" ON public.notification_templates;

-- Everyone can read templates (they're just templates, not sensitive)
CREATE POLICY "notification_templates_select_all"
ON public.notification_templates FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify templates
CREATE POLICY "notification_templates_admin_all"
ON public.notification_templates FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.2 ab_experiments - Enable RLS
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ab_experiments_select_all" ON public.ab_experiments;
DROP POLICY IF EXISTS "ab_experiments_admin_all" ON public.ab_experiments;

-- Everyone can read experiments (needed for frontend to know which variant to show)
CREATE POLICY "ab_experiments_select_all"
ON public.ab_experiments FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read too (for non-logged in users)
CREATE POLICY "ab_experiments_select_anon"
ON public.ab_experiments FOR SELECT
TO anon
USING (true);

-- Only admins can modify experiments
CREATE POLICY "ab_experiments_admin_all"
ON public.ab_experiments FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.3 experiment_assignments - Enable RLS
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "experiment_assignments_own" ON public.experiment_assignments;
DROP POLICY IF EXISTS "experiment_assignments_insert" ON public.experiment_assignments;
DROP POLICY IF EXISTS "experiment_assignments_admin_all" ON public.experiment_assignments;

-- Users can see their own assignments
CREATE POLICY "experiment_assignments_own"
ON public.experiment_assignments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can be assigned to experiments
CREATE POLICY "experiment_assignments_insert"
ON public.experiment_assignments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can see all assignments
CREATE POLICY "experiment_assignments_admin_all"
ON public.experiment_assignments FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.4 app_system_settings - Enable RLS
ALTER TABLE public.app_system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_system_settings_select_all" ON public.app_system_settings;
DROP POLICY IF EXISTS "app_system_settings_admin_all" ON public.app_system_settings;

-- Everyone can read system settings (needed for app configuration)
CREATE POLICY "app_system_settings_select_all"
ON public.app_system_settings FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read public settings
CREATE POLICY "app_system_settings_select_anon"
ON public.app_system_settings FOR SELECT
TO anon
USING (true);

-- Only admins can modify settings
CREATE POLICY "app_system_settings_admin_all"
ON public.app_system_settings FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.5 popular_searches - Enable RLS
ALTER TABLE public.popular_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "popular_searches_select_all" ON public.popular_searches;
DROP POLICY IF EXISTS "popular_searches_insert_auth" ON public.popular_searches;
DROP POLICY IF EXISTS "popular_searches_admin_all" ON public.popular_searches;

-- Everyone can read popular searches
CREATE POLICY "popular_searches_select_all"
ON public.popular_searches FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read too
CREATE POLICY "popular_searches_select_anon"
ON public.popular_searches FOR SELECT
TO anon
USING (true);

-- Authenticated users can add searches
CREATE POLICY "popular_searches_insert_auth"
ON public.popular_searches FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can manage all
CREATE POLICY "popular_searches_admin_all"
ON public.popular_searches FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.6 scheduled_reports - Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_reports_own" ON public.scheduled_reports;
DROP POLICY IF EXISTS "scheduled_reports_admin_all" ON public.scheduled_reports;

-- Users can see their own scheduled reports
CREATE POLICY "scheduled_reports_own"
ON public.scheduled_reports FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can create their own reports
CREATE POLICY "scheduled_reports_insert_own"
ON public.scheduled_reports FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update their own reports
CREATE POLICY "scheduled_reports_update_own"
ON public.scheduled_reports FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own reports
CREATE POLICY "scheduled_reports_delete_own"
ON public.scheduled_reports FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Admins can manage all reports
CREATE POLICY "scheduled_reports_admin_all"
ON public.scheduled_reports FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.7 report_executions - Enable RLS
ALTER TABLE public.report_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_executions_own" ON public.report_executions;
DROP POLICY IF EXISTS "report_executions_admin_all" ON public.report_executions;

-- Users can see executions of their own reports
CREATE POLICY "report_executions_own"
ON public.report_executions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM scheduled_reports sr 
        WHERE sr.id = report_executions.report_id 
        AND sr.created_by = auth.uid()
    )
);

-- System can insert executions (via service role)
CREATE POLICY "report_executions_insert"
ON public.report_executions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can manage all executions
CREATE POLICY "report_executions_admin_all"
ON public.report_executions FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2.8 feature_flags - Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_select_all" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_admin_all" ON public.feature_flags;

-- Everyone can read feature flags (needed for frontend to check features)
CREATE POLICY "feature_flags_select_all"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read feature flags too
CREATE POLICY "feature_flags_select_anon"
ON public.feature_flags FOR SELECT
TO anon
USING (true);

-- Only admins can modify feature flags
CREATE POLICY "feature_flags_admin_all"
ON public.feature_flags FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ====================================================
-- SUMMARY OF FIXES
-- ====================================================
/*
✅ Fixed SECURITY DEFINER views (now use SECURITY INVOKER):
   - camera_directory_safe
   - daily_registration_stats
   - registration_summary

✅ Enabled RLS on tables:
   - notification_templates (read: all, write: admin)
   - ab_experiments (read: all, write: admin)
   - experiment_assignments (read/write: own, admin: all)
   - app_system_settings (read: all, write: admin)
   - popular_searches (read: all, insert: auth, admin: all)
   - scheduled_reports (CRUD: own, admin: all)
   - report_executions (read: own reports, admin: all)
   - feature_flags (read: all, write: admin)

Run this migration in Supabase SQL Editor to fix all linter errors.
*/

-- ====================================================
-- DONE
-- ====================================================














