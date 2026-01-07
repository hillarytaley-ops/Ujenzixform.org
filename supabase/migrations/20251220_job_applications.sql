-- =====================================================
-- Job Applications Table
-- Created: 2024-12-20
-- Purpose: Store job applications from the Careers page
-- =====================================================

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job details
    job_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    department TEXT,
    
    -- Applicant details
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    linkedin_url TEXT,
    applicant_current_role TEXT,
    years_experience TEXT,
    salary_expectation TEXT,
    
    -- Application content
    cover_letter TEXT NOT NULL,
    resume_url TEXT,
    heard_from TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON public.job_applications(email);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON public.job_applications(created_at DESC);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert (submit applications)
CREATE POLICY "Anyone can submit job applications"
ON public.job_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view applications
CREATE POLICY "Admins can view all applications"
ON public.job_applications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Only admins can update applications
CREATE POLICY "Admins can update applications"
ON public.job_applications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_job_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_job_applications_updated_at();

-- Add comments
COMMENT ON TABLE public.job_applications IS 'Stores job applications submitted through the Careers page';
COMMENT ON COLUMN public.job_applications.status IS 'Application status: new, reviewing, shortlisted, interview, offered, hired, rejected';

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- INSERT INTO public.job_applications (job_id, job_title, department, full_name, email, phone, cover_letter, status)
-- VALUES 
--   ('ops-manager', 'Operations Manager', 'Operations', 'Test Applicant', 'test@example.com', '+254700000000', 'Test cover letter', 'new');












