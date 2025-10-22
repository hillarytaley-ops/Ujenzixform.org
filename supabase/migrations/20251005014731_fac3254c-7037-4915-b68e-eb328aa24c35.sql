-- Create security definer functions first
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Drop ALL existing policies on profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new restrictive policies
CREATE POLICY "profiles_users_view_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "profiles_users_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_admin())
WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "profiles_users_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admins_full_access"
ON public.profiles
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.profile_access_security_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessing_user_id uuid REFERENCES auth.users(id),
  target_profile_id uuid,
  access_type text NOT NULL,
  access_granted boolean DEFAULT false,
  access_justification text,
  security_risk_level text DEFAULT 'medium',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profile_access_security_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on audit table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profile_access_security_audit' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profile_access_security_audit';
    END LOOP;
END $$;

CREATE POLICY "audit_admins_view"
ON public.profile_access_security_audit
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "audit_system_insert"
ON public.profile_access_security_audit
FOR INSERT
TO authenticated
WITH CHECK (accessing_user_id = auth.uid());

-- Create audit trigger
CREATE OR REPLACE FUNCTION public.audit_profile_modifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_is_admin boolean;
  is_own_profile boolean;
BEGIN
  current_user_is_admin := is_admin();
  is_own_profile := (auth.uid() = COALESCE(NEW.user_id, OLD.user_id));
  
  INSERT INTO public.profile_access_security_audit (
    accessing_user_id,
    target_profile_id,
    access_type,
    access_granted,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    (current_user_is_admin OR is_own_profile),
    CASE
      WHEN current_user_is_admin THEN 'Admin modification'
      WHEN is_own_profile THEN 'User modifying own profile'
      ELSE 'UNAUTHORIZED MODIFICATION ATTEMPT'
    END,
    CASE
      WHEN current_user_is_admin OR is_own_profile THEN 'low'
      ELSE 'critical'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_modifications_trigger ON public.profiles;
CREATE TRIGGER audit_profile_modifications_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_modifications();