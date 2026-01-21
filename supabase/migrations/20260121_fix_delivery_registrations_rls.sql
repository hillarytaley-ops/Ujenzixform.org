-- =====================================================================
-- FIX DELIVERY PROVIDER REGISTRATIONS RLS
-- =====================================================================
-- Ensure admins can view all delivery provider registrations
-- =====================================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.delivery_provider_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    id_number TEXT,
    company_name TEXT,
    business_registration_number TEXT,
    is_company BOOLEAN DEFAULT false,
    county TEXT,
    town TEXT,
    physical_address TEXT,
    service_areas TEXT[],
    vehicle_type TEXT,
    vehicle_registration TEXT,
    vehicle_capacity_kg NUMERIC,
    vehicle_capacity_description TEXT,
    vehicle_photo_url TEXT,
    driving_license_number TEXT,
    driving_license_class TEXT,
    driving_license_expiry DATE,
    years_driving_experience INTEGER,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    insurance_expiry DATE,
    ntsa_compliance BOOLEAN DEFAULT false,
    good_conduct_certificate_url TEXT,
    base_rate_per_km NUMERIC,
    minimum_charge NUMERIC,
    available_days TEXT[],
    available_hours_start TEXT,
    available_hours_end TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    background_check_consent BOOLEAN DEFAULT false,
    terms_accepted BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'registration',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.delivery_provider_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own registration" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "Users can view own registration" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_registrations_insert" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_registrations_select" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_registrations_update" ON public.delivery_provider_registrations;

-- Allow authenticated users to insert their own registration
CREATE POLICY "delivery_registrations_insert"
ON public.delivery_provider_registrations FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid() OR auth_user_id IS NULL);

-- Allow users to view their own registration, admins can view all
CREATE POLICY "delivery_registrations_select"
ON public.delivery_provider_registrations FOR SELECT TO authenticated
USING (
    auth_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role::text = 'admin'
    )
);

-- Allow admins to update any registration
CREATE POLICY "delivery_registrations_update"
ON public.delivery_provider_registrations FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role::text = 'admin'
    )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_registrations_status ON public.delivery_provider_registrations(status);
CREATE INDEX IF NOT EXISTS idx_delivery_registrations_auth_user ON public.delivery_provider_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_registrations_email ON public.delivery_provider_registrations(email);

SELECT 'Delivery provider registrations RLS fixed!' as result;

