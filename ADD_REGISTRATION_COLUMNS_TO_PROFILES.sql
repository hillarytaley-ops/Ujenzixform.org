-- ================================================================
-- ADD REGISTRATION FORM COLUMNS TO PROFILES TABLE
-- ================================================================
-- Adds columns needed for Professional Builder and Private Client registration
-- ================================================================

-- Step 1: Create enum types if they don't exist
DO $$ 
BEGIN
  -- Create builder_category enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'builder_category') THEN
    CREATE TYPE public.builder_category AS ENUM ('professional', 'private');
    RAISE NOTICE '✓ Created builder_category enum type';
  ELSE
    RAISE NOTICE '✓ builder_category enum type already exists';
  END IF;
  
  -- Create app_role enum for user_roles table
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'builder', 'supplier', 'delivery_provider', 'professional_builder', 'private_client');
    RAISE NOTICE '✓ Created app_role enum type';
  ELSE
    RAISE NOTICE '✓ app_role enum type already exists';
  END IF;
END $$;

-- Step 1b: Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'builder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own role"
ON public.user_roles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

RAISE NOTICE '✓ user_roles table created/verified';

-- Step 2: Add builder_category column first
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS builder_category public.builder_category;

-- Step 3: Add columns for Private Client registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS project_types TEXT[],
ADD COLUMN IF NOT EXISTS project_timeline TEXT,
ADD COLUMN IF NOT EXISTS budget_range TEXT,
ADD COLUMN IF NOT EXISTS project_description TEXT,
ADD COLUMN IF NOT EXISTS property_type TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add columns for Professional Builder registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS specialties TEXT[],
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS insurance_details TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_builder_category ON public.profiles(builder_category);
CREATE INDEX IF NOT EXISTS idx_profiles_years_experience ON public.profiles(years_experience);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.project_types IS 'Array of project types for private clients (e.g., [''New House'', ''Renovation''])';
COMMENT ON COLUMN public.profiles.project_timeline IS 'When the client wants to start their project';
COMMENT ON COLUMN public.profiles.budget_range IS 'Budget range for private client projects';
COMMENT ON COLUMN public.profiles.project_description IS 'Detailed description of the private client''s project';
COMMENT ON COLUMN public.profiles.property_type IS 'Type of property (Single Family Home, Apartment, etc.)';
COMMENT ON COLUMN public.profiles.location IS 'User location (County in Kenya)';
COMMENT ON COLUMN public.profiles.specialties IS 'Array of professional specialties for builders';
COMMENT ON COLUMN public.profiles.years_experience IS 'Years of professional construction experience';
COMMENT ON COLUMN public.profiles.description IS 'Company/professional description';
COMMENT ON COLUMN public.profiles.portfolio_url IS 'Website or portfolio URL for professional builders';
COMMENT ON COLUMN public.profiles.insurance_details IS 'Professional liability insurance information';
COMMENT ON COLUMN public.profiles.registration_number IS 'Business registration number (KRA PIN)';
COMMENT ON COLUMN public.profiles.license_number IS 'NCA license number for professional builders';

-- Verify the columns were added
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN (
      'project_types', 'project_timeline', 'budget_range', 'project_description',
      'property_type', 'location', 'specialties', 'years_experience',
      'description', 'portfolio_url', 'insurance_details', 'registration_number',
      'license_number'
    );
  
  IF column_count >= 13 THEN
    RAISE NOTICE '✓ All registration columns added successfully to profiles table';
    RAISE NOTICE 'Total columns added: %', column_count;
  ELSE
    RAISE WARNING 'Only % of 13 columns were added. Please review.', column_count;
  END IF;
END $$;

