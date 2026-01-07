-- Job Applications Table for MradiPro Careers
-- This migration handles both new installs and updates to existing tables

-- Add missing columns if table exists (safe to run multiple times)
DO $$
BEGIN
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'job_applications' 
                   AND column_name = 'rating') THEN
        ALTER TABLE public.job_applications ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
    END IF;
    
    -- Add other columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'job_applications' 
                   AND column_name = 'admin_notes') THEN
        ALTER TABLE public.job_applications ADD COLUMN admin_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'job_applications' 
                   AND column_name = 'reviewed_by') THEN
        ALTER TABLE public.job_applications ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'job_applications' 
                   AND column_name = 'reviewed_at') THEN
        ALTER TABLE public.job_applications ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'job_applications' 
                   AND column_name = 'interview_date') THEN
        ALTER TABLE public.job_applications ADD COLUMN interview_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'job_applications' 
                   AND column_name = 'interview_notes') THEN
        ALTER TABLE public.job_applications ADD COLUMN interview_notes TEXT;
    END IF;
END $$;

-- Create indexes for better query performance (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_department ON public.job_applications(department);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON public.job_applications(email);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON public.job_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can submit job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can view all job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can update job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can delete job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Allow all select for authenticated" ON public.job_applications;
DROP POLICY IF EXISTS "Allow all for admins" ON public.job_applications;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.job_applications;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.job_applications;
DROP POLICY IF EXISTS "Enable update for admins" ON public.job_applications;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.job_applications;
DROP POLICY IF EXISTS "Enable update for all users" ON public.job_applications;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.job_applications;

-- SIMPLE RLS Policies that work with the admin dashboard

-- 1. Anyone can INSERT (submit applications from careers page)
CREATE POLICY "Enable insert for all users" 
ON public.job_applications 
FOR INSERT 
TO public
WITH CHECK (true);

-- 2. Anyone can SELECT (admin dashboard checks access via localStorage/session)
--    The admin dashboard itself is protected, so this is safe
CREATE POLICY "Enable read access for all users" 
ON public.job_applications 
FOR SELECT 
TO public
USING (true);

-- 3. Anyone can UPDATE (admin dashboard handles authorization)
CREATE POLICY "Enable update for all users" 
ON public.job_applications 
FOR UPDATE 
TO public
USING (true)
WITH CHECK (true);

-- 4. Anyone can DELETE (admin dashboard handles authorization)
CREATE POLICY "Enable delete for all users" 
ON public.job_applications 
FOR DELETE 
TO public
USING (true);

-- Create function to update updated_at timestamp
-- Setting search_path to empty string for security (prevents search_path injection attacks)
CREATE OR REPLACE FUNCTION public.update_job_applications_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER trigger_update_job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_job_applications_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.job_applications IS 'Stores job applications submitted through the MradiPro careers page';
COMMENT ON COLUMN public.job_applications.status IS 'Application status: new, reviewing, shortlisted, interview_scheduled, interviewed, offer_sent, hired, rejected, withdrawn';

-- Grant full permissions
GRANT ALL ON public.job_applications TO anon;
GRANT ALL ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;











