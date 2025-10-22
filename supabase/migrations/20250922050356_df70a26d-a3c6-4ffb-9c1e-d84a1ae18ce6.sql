-- Fix function search path warning for audit integrity function
CREATE OR REPLACE FUNCTION public.validate_audit_integrity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;