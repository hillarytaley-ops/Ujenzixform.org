-- Fix function search path security warning
-- Set explicit search_path for security functions to prevent manipulation

-- Update the validate_audit_integrity function with explicit search_path
CREATE OR REPLACE FUNCTION public.validate_audit_integrity()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Prevent modification of existing audit records
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit records cannot be modified after creation for integrity purposes';
  END IF;
  
  -- Prevent deletion of audit records
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit records cannot be deleted for compliance and security purposes';
  END IF;
  
  -- Validate insert operations
  IF TG_OP = 'INSERT' THEN
    -- Ensure created_at is recent (within last hour)
    IF NEW.created_at IS NOT NULL AND NEW.created_at < NOW() - INTERVAL '1 hour' THEN
      RAISE EXCEPTION 'Cannot create backdated audit records';
    END IF;
    
    -- Set created_at to current time if not provided
    IF NEW.created_at IS NULL THEN
      NEW.created_at = NOW();
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;