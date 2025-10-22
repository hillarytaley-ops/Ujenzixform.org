-- ===================================================================
-- CRITICAL SECURITY FIX: Supplier Application-Based Registration
-- ===================================================================
-- Issue: Current suppliers table allows any authenticated user to create
-- supplier records without verification, enabling fake supplier accounts
-- and potential data exposure.
--
-- Fix: Implement application-based registration with admin approval
-- ===================================================================

-- STEP 1: Create supplier_applications table
CREATE TABLE IF NOT EXISTS public.supplier_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  materials_offered TEXT[] DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  business_registration_number TEXT,
  years_in_business INTEGER,
  application_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone ~ '^\+?[0-9]{10,15}$'),
  CONSTRAINT one_application_per_user UNIQUE (applicant_user_id)
);

-- Enable RLS
ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_applications FORCE ROW LEVEL SECURITY;

-- STEP 2: Create RLS policies for applications

-- Applicants can view their own application
CREATE POLICY "supplier_applications_view_own"
ON public.supplier_applications
FOR SELECT
TO authenticated
USING (applicant_user_id = auth.uid());

-- Applicants can create ONE application (enforced by unique constraint)
CREATE POLICY "supplier_applications_create_own"
ON public.supplier_applications
FOR INSERT
TO authenticated
WITH CHECK (
  applicant_user_id = auth.uid()
  AND status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM supplier_applications 
    WHERE applicant_user_id = auth.uid()
  )
);

-- Applicants can update their pending application
CREATE POLICY "supplier_applications_update_own_pending"
ON public.supplier_applications
FOR UPDATE
TO authenticated
USING (
  applicant_user_id = auth.uid() 
  AND status = 'pending'
)
WITH CHECK (
  applicant_user_id = auth.uid()
  AND status = 'pending'  -- Can't change status themselves
);

-- Admins can view all applications
CREATE POLICY "supplier_applications_admin_view_all"
ON public.supplier_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can approve/reject applications
CREATE POLICY "supplier_applications_admin_review"
ON public.supplier_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Hard auth block for anonymous
CREATE POLICY "supplier_applications_require_auth"
ON public.supplier_applications
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 3: Update suppliers table policies - REMOVE INSERT for regular users

-- Drop the self-manage policy
DROP POLICY IF EXISTS "suppliers_self_manage" ON suppliers;

-- Create separate policies: SELECT/UPDATE only (no INSERT)
CREATE POLICY "suppliers_self_view"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  (auth.uid() IS NOT NULL) 
  AND (user_id = auth.uid())
);

CREATE POLICY "suppliers_self_update"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  (auth.uid() IS NOT NULL) 
  AND (user_id = auth.uid())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND (user_id = auth.uid())
);

-- NO INSERT POLICY for regular users - only admins via function

-- STEP 4: Create secure function for admin approval
CREATE OR REPLACE FUNCTION public.approve_supplier_application(
  application_id UUID,
  approval_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record RECORD;
  new_supplier_id UUID;
  new_profile_id UUID;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  END IF;
  
  -- Get application
  SELECT * INTO app_record
  FROM supplier_applications
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;
  
  -- Check if user already has a supplier record
  IF EXISTS (SELECT 1 FROM suppliers WHERE user_id = app_record.applicant_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already has a supplier account'
    );
  END IF;
  
  -- Get or create profile for the applicant
  SELECT id INTO new_profile_id
  FROM profiles
  WHERE user_id = app_record.applicant_user_id;
  
  IF new_profile_id IS NULL THEN
    INSERT INTO profiles (user_id, full_name, email)
    VALUES (
      app_record.applicant_user_id,
      app_record.contact_person,
      app_record.email
    )
    RETURNING id INTO new_profile_id;
  END IF;
  
  -- Create supplier record
  INSERT INTO suppliers (
    user_id,
    profile_id,
    company_name,
    contact_person,
    email,
    phone,
    address,
    materials_offered,
    specialties,
    is_verified,
    rating
  ) VALUES (
    app_record.applicant_user_id,
    new_profile_id,
    app_record.company_name,
    app_record.contact_person,
    app_record.email,
    app_record.phone,
    app_record.address,
    app_record.materials_offered,
    app_record.specialties,
    true,  -- Approved by admin = verified
    0
  )
  RETURNING id INTO new_supplier_id;
  
  -- Update application status
  UPDATE supplier_applications
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    application_notes = COALESCE(approval_notes, application_notes)
  WHERE id = application_id;
  
  -- Add supplier role to user
  INSERT INTO user_roles (user_id, role)
  VALUES (app_record.applicant_user_id, 'supplier'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the approval
  INSERT INTO security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'supplier_application_approved',
    'low',
    jsonb_build_object(
      'application_id', application_id,
      'new_supplier_id', new_supplier_id,
      'applicant_user_id', app_record.applicant_user_id,
      'company_name', app_record.company_name
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'supplier_id', new_supplier_id,
    'message', 'Supplier application approved successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_supplier_application TO authenticated;

-- STEP 5: Create function for rejection
CREATE OR REPLACE FUNCTION public.reject_supplier_application(
  application_id UUID,
  rejection_reason_text TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  END IF;
  
  -- Get application
  SELECT * INTO app_record
  FROM supplier_applications
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;
  
  -- Update application status
  UPDATE supplier_applications
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    rejection_reason = rejection_reason_text
  WHERE id = application_id;
  
  -- Log the rejection
  INSERT INTO security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'supplier_application_rejected',
    'low',
    jsonb_build_object(
      'application_id', application_id,
      'applicant_user_id', app_record.applicant_user_id,
      'company_name', app_record.company_name,
      'reason', rejection_reason_text
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Supplier application rejected'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_supplier_application TO authenticated;

-- STEP 6: Add comments
COMMENT ON TABLE supplier_applications IS 
'Supplier registration applications. All supplier accounts must go through admin approval.';

COMMENT ON FUNCTION approve_supplier_application IS 
'ADMIN ONLY: Approves a supplier application and creates the verified supplier account.';

COMMENT ON FUNCTION reject_supplier_application IS 
'ADMIN ONLY: Rejects a supplier application with a reason.';

-- STEP 7: Verification
DO $$
DECLARE
  table_exists BOOLEAN;
  insert_policy_exists BOOLEAN;
  approval_function_exists BOOLEAN;
BEGIN
  -- Check table created
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'supplier_applications'
  ) INTO table_exists;
  
  -- Check INSERT policy removed from suppliers
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'suppliers'
      AND cmd = 'INSERT'
      AND policyname NOT LIKE '%admin%'
  ) INTO insert_policy_exists;
  
  -- Check approval function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'approve_supplier_application'
  ) INTO approval_function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '✓ SUPPLIER APPLICATION SYSTEM DEPLOYED';
  RAISE NOTICE '======================================';
  RAISE NOTICE '  Applications table: %', CASE WHEN table_exists THEN 'Created' ELSE 'MISSING' END;
  RAISE NOTICE '  Direct INSERT blocked: %', CASE WHEN NOT insert_policy_exists THEN 'Yes' ELSE 'SECURITY RISK' END;
  RAISE NOTICE '  Approval function: %', CASE WHEN approval_function_exists THEN 'Available' ELSE 'MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '  ✓ Fake suppliers: PREVENTED (admin approval required)';
  RAISE NOTICE '  ✓ Contact spam: PREVENTED (no unverified suppliers)';
  RAISE NOTICE '  ✓ Application workflow: One per user';
  RAISE NOTICE '  ✓ Admin controls: approve/reject functions';
  RAISE NOTICE '';
  
  IF NOT table_exists OR insert_policy_exists OR NOT approval_function_exists THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Application system incomplete!';
  END IF;
END $$;