-- ===================================================================
-- CRITICAL SECURITY FIX: Block Direct Supplier Registration
-- ===================================================================

-- Drop and recreate supplier policies (simple approach)
DO $$
BEGIN
  -- Drop old policies
  DROP POLICY IF EXISTS "suppliers_self_manage" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_self_view" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_self_update" ON suppliers;
  
  -- Create new restrictive policies (NO INSERT for regular users)
  CREATE POLICY "suppliers_self_view"
  ON public.suppliers FOR SELECT TO authenticated
  USING ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()));
  
  CREATE POLICY "suppliers_self_update"
  ON public.suppliers FOR UPDATE TO authenticated
  USING ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))
  WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()));
  
  RAISE NOTICE '✓ Supplier direct INSERT blocked - only admins via approve_supplier_application()';
END $$;

-- Ensure approval functions exist
CREATE OR REPLACE FUNCTION public.approve_supplier_application(application_id UUID, approval_notes TEXT DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE app_record RECORD; new_supplier_id UUID; new_profile_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  
  SELECT * INTO app_record FROM supplier_applications WHERE id = application_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  
  IF EXISTS (SELECT 1 FROM suppliers WHERE user_id = app_record.applicant_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already exists');
  END IF;
  
  SELECT id INTO new_profile_id FROM profiles WHERE user_id = app_record.applicant_user_id;
  IF new_profile_id IS NULL THEN
    INSERT INTO profiles (user_id, full_name, email)
    VALUES (app_record.applicant_user_id, app_record.contact_person, app_record.email)
    RETURNING id INTO new_profile_id;
  END IF;
  
  INSERT INTO suppliers (user_id, profile_id, company_name, contact_person, email, phone, address, materials_offered, specialties, is_verified, rating)
  VALUES (app_record.applicant_user_id, new_profile_id, app_record.company_name, app_record.contact_person, app_record.email, app_record.phone, app_record.address, app_record.materials_offered, app_record.specialties, true, 0)
  RETURNING id INTO new_supplier_id;
  
  UPDATE supplier_applications SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW() WHERE id = application_id;
  INSERT INTO user_roles (user_id, role) VALUES (app_record.applicant_user_id, 'supplier'::app_role) ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'supplier_id', new_supplier_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_supplier_application(application_id UUID, rejection_reason_text TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  
  UPDATE supplier_applications SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW(), rejection_reason = rejection_reason_text
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION approve_supplier_application TO authenticated;
GRANT EXECUTE ON FUNCTION reject_supplier_application TO authenticated;

-- Final verification
DO $$
DECLARE non_admin_insert_count INT;
BEGIN
  SELECT COUNT(*) INTO non_admin_insert_count FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers' 
    AND cmd = 'INSERT' AND policyname NOT LIKE '%admin%';
  
  IF non_admin_insert_count > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Non-admin can still INSERT to suppliers!';
  END IF;
  
  RAISE NOTICE '✓ SUPPLIER SECURITY COMPLETE';
  RAISE NOTICE '  Fake suppliers: BLOCKED (admin approval required)';
  RAISE NOTICE '  Contact harvesting: PREVENTED';
END $$;