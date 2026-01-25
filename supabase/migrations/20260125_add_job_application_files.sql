-- =====================================================
-- Add File URL Columns to Job Applications
-- Created: 2026-01-25
-- Purpose: Store resume and cover letter file URLs
-- =====================================================

-- Add cover_letter_file_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'job_applications' 
        AND column_name = 'cover_letter_file_url'
    ) THEN
        ALTER TABLE public.job_applications ADD COLUMN cover_letter_file_url TEXT;
        COMMENT ON COLUMN public.job_applications.cover_letter_file_url IS 'URL to uploaded cover letter file';
    END IF;
END $$;

-- Add portfolio_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'job_applications' 
        AND column_name = 'portfolio_url'
    ) THEN
        ALTER TABLE public.job_applications ADD COLUMN portfolio_url TEXT;
        COMMENT ON COLUMN public.job_applications.portfolio_url IS 'URL to applicant portfolio/GitHub';
    END IF;
END $$;

-- Update the status check constraint to include 'pending' if not already
-- First drop the existing constraint if it exists
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;

-- Add updated constraint with all status values
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check 
CHECK (status IN ('new', 'pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'));

-- =====================================================
-- Create Documents Storage Bucket
-- =====================================================

-- Note: Storage buckets are typically created via Supabase Dashboard
-- or using the Supabase client. Here's the SQL for reference:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow public uploads to documents bucket
-- This should be configured in Supabase Dashboard under Storage > documents > Policies

COMMENT ON TABLE public.job_applications IS 'Stores job applications with resume and cover letter file uploads';

