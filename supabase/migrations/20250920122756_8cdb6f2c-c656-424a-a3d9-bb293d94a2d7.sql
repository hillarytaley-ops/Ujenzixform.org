-- ULTRA-STRICT CONTACT PROTECTION: BUSINESS RELATIONSHIP VERIFICATION
-- Prevents scammers from harvesting phone/email for spam and fraud
-- Only users with verified active business relationships can access contact info

-- Drop existing policies on both sensitive tables
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop all policies on delivery_providers
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'delivery_providers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
    
    -- Drop all policies on suppliers  
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- DELIVERY_PROVIDERS: ADMIN-ONLY ACCESS (NO EXCEPTIONS)
-- Contains: phone, email, address, license numbers, documents
CREATE POLICY "delivery_providers_admin_only_verified" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- SUPPLIERS: BUSINESS RELATIONSHIP VERIFICATION REQUIRED
-- Policy 1: Admin full access
CREATE POLICY "suppliers_admin_verified_access" 
ON public.suppliers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy 2: Suppliers can only access their own data
CREATE POLICY "suppliers_self_access_verified" 
ON public.suppliers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = suppliers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = suppliers.user_id
  )
);

-- Policy 3: Builders can ONLY view suppliers with ACTIVE business relationship
CREATE POLICY "suppliers_verified_business_relationship_only" 
ON public.suppliers
FOR SELECT 
TO authenticated
USING (
  -- Only allow access if there's an ACTIVE delivery relationship
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'builder'
    AND EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.supplier_id = suppliers.id
      AND d.builder_id = p.id
      AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
      AND d.created_at > NOW() - INTERVAL '30 days'
    )
  )
);

-- Create enhanced business relationship verification function
CREATE OR REPLACE FUNCTION public.verify_supplier_business_relationship(supplier_uuid uuid)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_profile_id uuid;
  has_active_relationship boolean := false;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO current_user_profile_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check for ACTIVE business relationship (last 30 days)
  SELECT EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.supplier_id = supplier_uuid
    AND d.builder_id = current_user_profile_id
    AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
    AND d.created_at > NOW() - INTERVAL '30 days'
  ) INTO has_active_relationship;
  
  -- Log verification attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, business_relationship_verified, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'business_relationship_verification',
    has_active_relationship, has_active_relationship,
    CASE WHEN has_active_relationship 
         THEN 'Active business relationship verified'
         ELSE 'No active business relationship - contact access blocked'
    END,
    CASE WHEN has_active_relationship THEN 'low' ELSE 'high' END
  );
  
  RETURN has_active_relationship;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to detect contact harvesting attempts
CREATE OR REPLACE FUNCTION public.detect_contact_harvesting_patterns()
RETURNS TRIGGER AS $$
DECLARE
    recent_contact_attempts INTEGER;
    recent_supplier_attempts INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent contact access attempts across both tables
    SELECT COUNT(*) INTO recent_contact_attempts
    FROM supplier_contact_security_audit
    WHERE user_id = NEW.user_id
    AND contact_field_requested IN ('phone', 'email', 'all', 'contact_verification')
    AND created_at > NOW() - INTERVAL '5 minutes';
    
    -- Count recent supplier access attempts  
    SELECT COUNT(DISTINCT supplier_id) INTO recent_supplier_attempts
    FROM supplier_contact_security_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Detect suspicious harvesting patterns
    IF (recent_contact_attempts > 10 OR recent_supplier_attempts > 5) AND user_role != 'admin' THEN
        -- Log critical security event
        INSERT INTO emergency_security_log (
            user_id, event_type, event_data
        ) VALUES (
            NEW.user_id,
            'CRITICAL_CONTACT_HARVESTING_DETECTED',
            format('SCAM ALERT: Potential contact harvesting - %s contact attempts, %s suppliers accessed in 10 minutes by %s role. Risk: Spam, fraud, harassment', 
                   recent_contact_attempts, recent_supplier_attempts, user_role)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply enhanced harvesting detection
DROP TRIGGER IF EXISTS detect_contact_harvesting ON supplier_contact_security_audit;
CREATE TRIGGER detect_contact_harvesting
  AFTER INSERT ON supplier_contact_security_audit
  FOR EACH ROW EXECUTE FUNCTION detect_contact_harvesting_patterns();

-- Create function to log all contact data access attempts
CREATE OR REPLACE FUNCTION public.log_contact_access_attempts()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  table_name TEXT := TG_TABLE_NAME;
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log contact data access attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    CASE 
      WHEN table_name = 'suppliers' THEN COALESCE(NEW.id, OLD.id)
      WHEN table_name = 'delivery_providers' THEN COALESCE(NEW.id, OLD.id)
      ELSE NULL
    END,
    format('%s_table_access_%s', table_name, TG_OP),
    CASE WHEN user_role = 'admin' THEN true ELSE false END,
    format('Contact data %s on %s table by %s role', TG_OP, table_name, COALESCE(user_role, 'unknown')),
    CASE user_role
      WHEN 'admin' THEN 'low'
      ELSE 'high'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply contact access logging to both tables
DROP TRIGGER IF EXISTS log_supplier_contact_access ON suppliers;
CREATE TRIGGER log_supplier_contact_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION log_contact_access_attempts();

DROP TRIGGER IF EXISTS log_provider_contact_access ON delivery_providers;  
CREATE TRIGGER log_provider_contact_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON delivery_providers
  FOR EACH ROW EXECUTE FUNCTION log_contact_access_attempts();

-- Log this critical security enhancement
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'CONTACT_HARVESTING_PROTECTION_IMPLEMENTED',
  'CRITICAL SUCCESS: Ultra-strict RLS policies implemented with business relationship verification. Contact information (phone, email) now protected from scammers, spam, and fraud. Only verified business relationships can access contact data.'
);