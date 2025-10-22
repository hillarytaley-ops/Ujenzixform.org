-- Add builder category support to profiles table
-- This migration adds a builder_category field to distinguish between Professional Builders (Contractors) and Private Builders

-- Create enum for builder categories
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'builder_category') THEN
    CREATE TYPE public.builder_category AS ENUM ('professional', 'private');
  END IF;
END $$;

-- Add builder_category column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS builder_category public.builder_category;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_builder_category ON public.profiles(builder_category);

-- Update existing profiles to set builder_category based on current logic
-- Professional builders: companies or users marked as professional
-- Private clients: individuals who are not professional (clients needing construction services)
UPDATE public.profiles 
SET builder_category = CASE 
  WHEN user_type = 'company' OR is_professional = true THEN 'professional'::builder_category
  WHEN user_type = 'individual' AND (is_professional = false OR is_professional IS NULL) THEN 'private'::builder_category
  ELSE NULL
END
WHERE builder_category IS NULL;

-- Add client user type support
-- Note: user_type can now be 'individual', 'company', or 'client'

-- Update the handle_new_user function to set builder_category during registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, builder_category, user_type, is_professional)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- Set default builder_category based on metadata or default to private
    COALESCE(
      (NEW.raw_user_meta_data->>'builder_category')::builder_category,
      'private'::builder_category
    ),
    -- Set user_type based on builder_category and metadata
    COALESCE(
      NEW.raw_user_meta_data->>'user_type',
      CASE 
        WHEN COALESCE((NEW.raw_user_meta_data->>'builder_category')::builder_category, 'private'::builder_category) = 'professional' 
        THEN 'company'
        ELSE 'client'
      END
    ),
    -- Set is_professional based on builder_category
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'builder_category')::builder_category, 'private'::builder_category) = 'professional' 
      THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.builder_category IS 'Categorizes users as either professional (contractors/companies) or private (clients needing construction services)';
