-- RPC for admin to fetch all users with roles (bypasses RLS for authorized admins)
-- Allows both user_roles.admin and admin_staff members to view

CREATE OR REPLACE FUNCTION public.admin_get_all_users_with_roles()
RETURNS TABLE(
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  -- Allow if in user_roles with admin-like role OR in admin_staff
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('admin', 'super_admin', 'logistics_officer', 'finance_officer')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.admin_staff
    WHERE admin_staff.user_id = auth.uid()
       OR (SELECT email FROM auth.users WHERE id = auth.uid()) = admin_staff.email
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    ur.role::text,
    ur.created_at,
    p.full_name,
    COALESCE(p.email, 'User ' || LEFT(ur.user_id::text, 8))::TEXT
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  ORDER BY ur.created_at DESC;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users_with_roles() TO authenticated;
