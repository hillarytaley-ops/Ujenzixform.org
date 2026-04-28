-- Pre-auth /auth: gate "Staff portal" when Edge Function is down or unreachable.
-- SECURITY DEFINER function returns only boolean (no row leak). Pair with Edge rate limits when possible.

GRANT EXECUTE ON FUNCTION public.is_admin_staff_portal_email(text) TO anon, authenticated;

COMMENT ON FUNCTION public.is_admin_staff_portal_email(text) IS
  'True if p_email matches an active admin_staff row. Client: Edge is-admin-staff-portal-email first; RPC is fallback for anon when Edge fails.';
