-- ============================================================
-- Create Profile for Builder (kosgeihill@gmail.com)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Insert profile for the builder if it doesn't exist
INSERT INTO profiles (id, user_id, full_name, company_name, email, phone, location, role)
VALUES (
    '1ee5dc53-4cc1-4021-a41d-65b7fe7dbdf1',
    '1ee5dc53-4cc1-4021-a41d-65b7fe7dbdf1',
    'Kosgei Hill',
    'UjenziXform',
    'kosgeihill@gmail.com',
    '+254 700 000 000',
    'Kenya',
    'professional_builder'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    location = COALESCE(EXCLUDED.location, profiles.location);

-- Also try with user_id as primary
INSERT INTO profiles (user_id, full_name, company_name, email, phone, location, role)
VALUES (
    '1ee5dc53-4cc1-4021-a41d-65b7fe7dbdf1',
    'Kosgei Hill',
    'UjenziXform',
    'kosgeihill@gmail.com',
    '+254 700 000 000',
    'Kenya',
    'professional_builder'
)
ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    location = COALESCE(EXCLUDED.location, profiles.location);

-- Verify the profile was created
SELECT * FROM profiles WHERE user_id = '1ee5dc53-4cc1-4021-a41d-65b7fe7dbdf1';
