-- =====================================================================
-- FIX ACTIVITY_LOGS TABLE - Run this SQL in Supabase SQL Editor
-- =====================================================================

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'activity_logs'
ORDER BY ordinal_position;

-- Step 2: Drop and recreate the table with correct structure
-- WARNING: This will delete existing data. If you need to keep data, skip this step.

DROP TABLE IF EXISTS public.activity_logs CASCADE;

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  details TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for category
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_category_check 
  CHECK (category IN ('auth', 'admin', 'user', 'content', 'order', 'delivery', 'system', 'staff', 'security'));

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "activity_logs_select_admin"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);

CREATE POLICY "activity_logs_insert_all"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_category ON public.activity_logs(category);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);

-- Grant permissions
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'activity_logs'
ORDER BY ordinal_position;









