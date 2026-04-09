-- Re-enable /auth Staff Access gating: RPC callable by anon so unauthenticated users can reveal the link only after typing a matching staff email.
-- Tradeoff: possible enumeration of staff emails; mitigate with rate limits / WAF if needed.

GRANT EXECUTE ON FUNCTION public.is_admin_staff_portal_email(text) TO anon, authenticated;

COMMENT ON FUNCTION public.is_admin_staff_portal_email(text) IS
  'Returns true if email matches an active admin_staff row; used to show Staff Access on public auth page only for listed staff.';
