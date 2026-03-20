-- ============================================================
-- When admin approves delivery_provider_registrations, upsert
-- public.delivery_providers + profiles so supplier/builder UIs
-- and RPCs see provider_name + phone (auth.users.id linkage).
-- Replaces admin_update_delivery_provider_status body.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_delivery_provider_status(
  registration_id uuid,
  new_status text,
  admin_notes_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_registration_exists boolean;
  r RECORD;
  v_display_name text;
  v_provider_type text;
  v_rows int;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  IF new_status NOT IN ('pending', 'approved', 'rejected', 'under_review') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status. Must be: pending, approved, rejected, or under_review'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.delivery_provider_registrations WHERE id = registration_id
  ) INTO v_registration_exists;

  IF NOT v_registration_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  UPDATE public.delivery_provider_registrations
  SET
    status = new_status,
    reviewed_at = now(),
    reviewed_by = v_admin_id,
    admin_notes = COALESCE(admin_notes_text, admin_notes),
    updated_at = now()
  WHERE id = registration_id;

  IF new_status = 'approved' THEN
    SELECT * INTO r FROM public.delivery_provider_registrations WHERE id = registration_id;

    v_display_name := COALESCE(NULLIF(trim(r.company_name), ''), trim(r.full_name));
    IF v_display_name IS NULL OR v_display_name = '' THEN
      v_display_name := 'Delivery Provider';
    END IF;

    v_provider_type := CASE WHEN r.is_company THEN 'company' ELSE 'individual' END;

    UPDATE public.profiles p
    SET
      full_name = v_display_name,
      phone = NULLIF(trim(r.phone), ''),
      updated_at = now()
    WHERE p.user_id = r.auth_user_id;

    UPDATE public.delivery_providers dp
    SET
      provider_name = v_display_name,
      phone = NULLIF(trim(r.phone), ''),
      email = NULLIF(trim(r.email), ''),
      address = COALESCE(NULLIF(trim(r.physical_address), ''), NULLIF(trim(r.county), '')),
      provider_type = v_provider_type,
      contact_person = CASE WHEN r.is_company THEN NULLIF(trim(r.full_name), '') ELSE NULL END,
      vehicle_types = CASE
        WHEN r.vehicle_type IS NOT NULL AND trim(r.vehicle_type) <> '' THEN ARRAY[trim(r.vehicle_type)]::text[]
        ELSE ARRAY['motorcycle']::text[]
      END,
      service_areas = COALESCE(r.service_areas, ARRAY[]::text[]),
      driving_license_number = NULLIF(trim(r.driving_license_number), ''),
      is_verified = true,
      is_active = true,
      updated_at = now()
    WHERE dp.user_id = r.auth_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
      INSERT INTO public.delivery_providers (
        user_id,
        provider_name,
        provider_type,
        phone,
        email,
        address,
        contact_person,
        vehicle_types,
        service_areas,
        driving_license_number,
        is_verified,
        is_active,
        updated_at
      )
      VALUES (
        r.auth_user_id,
        v_display_name,
        v_provider_type,
        COALESCE(NULLIF(trim(r.phone), ''), '0000000000'),
        NULLIF(trim(r.email), ''),
        COALESCE(NULLIF(trim(r.physical_address), ''), NULLIF(trim(r.county), '')),
        CASE WHEN r.is_company THEN NULLIF(trim(r.full_name), '') ELSE NULL END,
        CASE
          WHEN r.vehicle_type IS NOT NULL AND trim(r.vehicle_type) <> '' THEN ARRAY[trim(r.vehicle_type)]::text[]
          ELSE ARRAY['motorcycle']::text[]
        END,
        COALESCE(r.service_areas, ARRAY[]::text[]),
        NULLIF(trim(r.driving_license_number), ''),
        true,
        true,
        now()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Status updated successfully',
    'registration_id', registration_id,
    'new_status', new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) IS
  'Admin: set registration status; on approved, upsert delivery_providers + sync profiles for name/phone display.';

GRANT EXECUTE ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) TO authenticated;
