-- Vendor multi-tenant invoicing: KRA PIN + legal business name on supplier applications
-- and propagate into suppliers row on admin approval.

ALTER TABLE public.supplier_applications
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS kra_pin TEXT;

COMMENT ON COLUMN public.supplier_applications.legal_business_name IS
  'Registered legal name as on KRA certificate; required for eTIMS vendor onboarding.';
COMMENT ON COLUMN public.supplier_applications.kra_pin IS
  'Supplier KRA PIN collected at registration; copied to suppliers on approval.';

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
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  END IF;

  SELECT * INTO app_record
  FROM supplier_applications
  WHERE id = application_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM suppliers WHERE user_id = app_record.applicant_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already has a supplier account'
    );
  END IF;

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

  INSERT INTO suppliers (
    user_id,
    profile_id,
    company_name,
    legal_business_name,
    kra_pin,
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
    COALESCE(NULLIF(trim(app_record.legal_business_name), ''), app_record.company_name),
    NULLIF(upper(trim(app_record.kra_pin)), ''),
    app_record.contact_person,
    app_record.email,
    app_record.phone,
    app_record.address,
    app_record.materials_offered,
    app_record.specialties,
    true,
    0
  )
  RETURNING id INTO new_supplier_id;

  UPDATE supplier_applications
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    application_notes = COALESCE(approval_notes, application_notes)
  WHERE id = application_id;

  RETURN jsonb_build_object(
    'success', true,
    'supplier_id', new_supplier_id,
    'message', 'Supplier application approved'
  );
END;
$$;
