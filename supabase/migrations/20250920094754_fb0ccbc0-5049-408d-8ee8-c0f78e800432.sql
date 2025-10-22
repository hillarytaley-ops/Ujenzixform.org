-- Fix security warning: Set proper search_path for the function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;