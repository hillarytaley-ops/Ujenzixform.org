-- Reverses 20260426130000_grant_is_admin_staff_portal_email_clients.sql:
-- anon/authenticated can no longer call is_admin_staff_portal_email (Staff Access gating on /auth will break until re-granted).

REVOKE EXECUTE ON FUNCTION public.is_admin_staff_portal_email(text) FROM anon, authenticated;

COMMENT ON FUNCTION public.is_admin_staff_portal_email(text) IS
  'Legacy: client EXECUTE revoked; not callable from browser. Re-grant to anon, authenticated if Staff Access email gating is required again.';
