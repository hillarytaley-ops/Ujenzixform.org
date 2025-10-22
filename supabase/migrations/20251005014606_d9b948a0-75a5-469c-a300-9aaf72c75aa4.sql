-- Create security definer function to check admin status
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

-- Create security definer function to get current user's profile ID
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

-- Drop existing conflicting policies on profiles table
DROP POLICY IF EXISTS "Builders can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Suppliers can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Delivery providers can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_admin())
WITH CHECK (user_id = auth.uid() OR is_admin());

-- Policy: Users can insert their own profile (for new user creation)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Admins have full access to all profiles
CREATE POLICY "Admins have full access"
ON public.profiles
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Create audit log for profile modifications
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

-- Only admins can view audit logs
CREATE POLICY "Admins can view profile audit logs"
ON public.profile_access_security_audit
FOR SELECT
TO authenticated
USING (is_admin());

-- System can insert audit logs
CREATE POLICY "System can insert profile audit logs"
ON public.profile_access_security_audit
FOR INSERT
TO authenticated
WITH CHECK (accessing_user_id = auth.uid());

-- Create trigger to audit profile modifications (INSERT, UPDATE, DELETE only)
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

-- Attach audit trigger to profiles table (INSERT, UPDATE, DELETE only)
DROP TRIGGER IF EXISTS audit_profile_modifications_trigger ON public.profiles;
CREATE TRIGGER audit_profile_modifications_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_modifications();