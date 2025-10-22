-- Create secure admin management system
-- Remove self-service admin role assignment and create admin-only controls

-- Create a secure admin management table for logging admin actions
CREATE TABLE IF NOT EXISTS admin_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_user_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin management
ALTER TABLE admin_management ENABLE ROW LEVEL SECURITY;

-- Only existing admins can view admin management logs
CREATE POLICY "Admin management logs admin only" ON admin_management
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create a function to prevent regular users from becoming admin
CREATE OR REPLACE FUNCTION prevent_self_admin_assignment()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- If user is trying to set their own role to admin
  IF NEW.role = 'admin' AND NEW.user_id = auth.uid() THEN
    -- Only allow if they're already an admin
    IF current_user_role != 'admin' THEN
      RAISE EXCEPTION 'Admin role assignment is restricted to authorized personnel only';
    END IF;
  END IF;
  
  -- Log admin role changes for security auditing
  IF NEW.role = 'admin' OR (TG_OP = 'UPDATE' AND OLD.role = 'admin') THEN
    INSERT INTO admin_management (action_type, target_user_id, performed_by, reason)
    VALUES (
      CASE 
        WHEN NEW.role = 'admin' THEN 'ADMIN_ROLE_GRANTED'
        ELSE 'ADMIN_ROLE_REVOKED'
      END,
      NEW.user_id,
      auth.uid(),
      'Role change detected via database trigger'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_self_admin_trigger ON profiles;

-- Create trigger to prevent self-admin assignment
CREATE TRIGGER prevent_self_admin_trigger
  BEFORE UPDATE OR INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_admin_assignment();

-- Create a more restrictive policy for profile updates
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile (non-admin fields)" ON profiles;

-- Allow users to update their profiles but prevent self-admin assignment
CREATE POLICY "Users can update own profile except admin role" ON profiles
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());