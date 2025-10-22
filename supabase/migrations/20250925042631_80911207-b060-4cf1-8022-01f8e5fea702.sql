-- Fix function search path security warning
-- Set search_path to be immutable for all functions

ALTER FUNCTION public.audit_sensitive_contact_access() SET search_path = 'public';

-- Also fix any other functions that might have mutable search paths
ALTER FUNCTION public.get_supplier_stats() SET search_path = 'public';
ALTER FUNCTION public.get_suppliers_directory_safe() SET search_path = 'public';
ALTER FUNCTION public.suppliers_security_audit_v2() SET search_path = 'public';
ALTER FUNCTION public.get_supplier_contact_secure(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.verify_business_relationship(uuid, jsonb) SET search_path = 'public';
ALTER FUNCTION public.get_builder_deliveries_safe(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_driver_contact_secure(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.get_delivery_tracking_public(text) SET search_path = 'public';
ALTER FUNCTION public.create_missing_profiles() SET search_path = 'public';
ALTER FUNCTION public.delete_delivery_provider_public() SET search_path = 'public';
ALTER FUNCTION public.verify_supplier_business_relationship(uuid, jsonb) SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_business_relationships() SET search_path = 'public';
ALTER FUNCTION public.audit_supplier_data_changes() SET search_path = 'public';
ALTER FUNCTION public.get_supplier_contact_with_business_validation(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.detect_location_stalking_patterns() SET search_path = 'public';
ALTER FUNCTION public.verify_business_relationship_strict(uuid, jsonb, text) SET search_path = 'public';
ALTER FUNCTION public.get_suppliers_public_safe() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_verifications_manual() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_profile() SET search_path = 'public';
ALTER FUNCTION public.audit_provider_contact_access() SET search_path = 'public';
ALTER FUNCTION public.verify_active_delivery_access(uuid) SET search_path = 'public';
ALTER FUNCTION public.log_payment_info_access(uuid, text, text[]) SET search_path = 'public';
ALTER FUNCTION public.get_payment_secure(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_payment_preferences_secure(uuid) SET search_path = 'public';
ALTER FUNCTION public.encrypt_payment_details() SET search_path = 'public';
ALTER FUNCTION public.audit_supplier_table_access() SET search_path = 'public';
ALTER FUNCTION public.get_delivery_providers_admin_only() SET search_path = 'public';
ALTER FUNCTION public.get_providers_for_active_delivery_only() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_provider_relationships() SET search_path = 'public';
ALTER FUNCTION public.audit_driver_contact_access() SET search_path = 'public';
ALTER FUNCTION public.get_delivery_provider_contact_secure(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_delivery_providers_public_safe() SET search_path = 'public';
ALTER FUNCTION public.is_authorized_for_delivery(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_deliveries_with_address_protection() SET search_path = 'public';
ALTER FUNCTION public.get_delivery_requests_with_address_protection() SET search_path = 'public';

-- Verification notice
DO $$
BEGIN
  RAISE NOTICE 'Security warning fixed: Function search paths set to immutable';
END $$;