-- Create the driver_contact_data table if it doesn't exist with ultra-secure admin-only RLS policies
CREATE TABLE IF NOT EXISTS public.driver_contact_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id uuid NOT NULL,
  driver_name text NOT NULL,
  driver_phone text,
  driver_email text,
  driver_license_number text,
  vehicle_registration text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.driver_contact_data ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "driver_contact_admin_only_access" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_admin_only_select" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_admin_only_insert" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_admin_only_update" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_admin_only_delete" ON public.driver_contact_data;

-- Create ultra-strict admin-only RLS policies for all operations
CREATE POLICY "driver_contact_admin_only_select_2024" 
ON public.driver_contact_data 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "driver_contact_admin_only_insert_2024" 
ON public.driver_contact_data 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "driver_contact_admin_only_update_2024" 
ON public.driver_contact_data 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "driver_contact_admin_only_delete_2024" 
ON public.driver_contact_data 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.update_driver_contact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS update_driver_contact_data_updated_at ON public.driver_contact_data;
CREATE TRIGGER update_driver_contact_data_updated_at
    BEFORE UPDATE ON public.driver_contact_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_driver_contact_updated_at();

-- Log security implementation
INSERT INTO public.driver_personal_data_audit (
  user_id, driver_id, access_type, access_granted,
  sensitive_fields_accessed, access_justification, security_risk_level
) VALUES (
  null, null, 'RLS_POLICIES_IMPLEMENTED_DRIVER_CONTACT_DATA',
  true, 
  ARRAY['driver_name', 'driver_phone', 'driver_email', 'driver_license_number'],
  'Ultra-strict admin-only RLS policies implemented for driver contact data table',
  'low'
);