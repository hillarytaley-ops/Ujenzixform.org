-- Public auth page no longer calls is_admin_staff_portal_email (always-visible Staff Access link).
-- Revoke client EXECUTE to close anonymous email-enumeration against admin_staff.

REVOKE EXECUTE ON FUNCTION public.is_admin_staff_portal_email(text) FROM anon, authenticated;

COMMENT ON FUNCTION public.is_admin_staff_portal_email(text) IS
  'Legacy: was used on /auth; revoked from clients. Reserved for future internal/admin tooling if needed.';
