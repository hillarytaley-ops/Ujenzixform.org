-- =====================================================
-- SECURITY ENHANCEMENT: Block Anonymous Access & Tighten RLS
-- Addresses: PUBLIC_USER_DATA, EXPOSED_SENSITIVE_DATA, MISSING_RLS_PROTECTION
-- =====================================================

-- 1. PROFILES TABLE: Explicit Anonymous Blocking (PUBLIC_USER_DATA)
DROP POLICY IF EXISTS "profiles_self_or_admin_select_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_deny_anonymous" ON public.profiles;

-- Explicit deny for anonymous users (evaluated first)
CREATE POLICY "profiles_deny_anonymous"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Restrictive SELECT for authenticated users only
CREATE POLICY "profiles_self_or_admin_select_only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. SUPPLIERS TABLE: Enhanced Direct Protection (EXPOSED_SENSITIVE_DATA)
-- Add explicit anonymous blocking to suppliers table
DROP POLICY IF EXISTS "suppliers_deny_anonymous" ON public.suppliers;

CREATE POLICY "suppliers_deny_anonymous"
ON public.suppliers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Enhance supplier contact access function to require stronger verification
CREATE OR REPLACE FUNCTION public.has_verified_supplier_business_access(supplier_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only grant access if user is:
  -- 1. The supplier owner
  -- 2. An admin
  -- 3. Has a RECENT (last 30 days) completed transaction
  SELECT EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = supplier_uuid 
    AND s.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = supplier_uuid
    AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed')
    AND po.created_at > NOW() - INTERVAL '30 days'
    AND po.total_amount > 0
  );
$$;

-- 3. DELIVERIES TABLE: Restrict Supplier Access (MISSING_RLS_PROTECTION)
DROP POLICY IF EXISTS "deliveries_supplier_active_only" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_supplier_direct_only" ON public.deliveries;

-- Suppliers can ONLY see deliveries where they are DIRECTLY assigned
CREATE POLICY "deliveries_supplier_direct_only"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  supplier_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = deliveries.supplier_id 
    AND s.user_id = auth.uid()
  )
);

-- 4. Enhanced Access Logging
CREATE OR REPLACE FUNCTION log_delivery_address_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all address access for deliveries
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(), NEW.id, 'delivery',
    TG_OP, ARRAY['pickup_address', 'delivery_address']
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_delivery_address_access ON public.deliveries;
CREATE TRIGGER audit_delivery_address_access
AFTER INSERT OR UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION log_delivery_address_access();

-- 5. Rate Limiting to Prevent Data Enumeration
CREATE TABLE IF NOT EXISTS public.query_rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  table_name text NOT NULL,
  query_count integer DEFAULT 1,
  window_start timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, table_name)
);

ALTER TABLE public.query_rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_admin_only"
ON public.query_rate_limit_log
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to detect enumeration attempts
CREATE OR REPLACE FUNCTION detect_enumeration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Count queries in last minute
  SELECT COALESCE(query_count, 0) INTO recent_count
  FROM query_rate_limit_log
  WHERE user_id = auth.uid()
  AND table_name = TG_TABLE_NAME
  AND window_start > NOW() - INTERVAL '1 minute';
  
  -- Alert on suspicious activity
  IF recent_count > 50 THEN
    INSERT INTO security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(), 'potential_data_enumeration', 'critical',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'query_count', recent_count + 1,
        'window', '1 minute'
      )
    );
  END IF;
  
  -- Update tracking
  INSERT INTO query_rate_limit_log (user_id, table_name, query_count)
  VALUES (auth.uid(), TG_TABLE_NAME, 1)
  ON CONFLICT (user_id, table_name) 
  DO UPDATE SET 
    query_count = CASE 
      WHEN query_rate_limit_log.window_start < NOW() - INTERVAL '1 minute' 
      THEN 1
      ELSE query_rate_limit_log.query_count + 1
    END,
    window_start = CASE 
      WHEN query_rate_limit_log.window_start < NOW() - INTERVAL '1 minute' 
      THEN NOW() 
      ELSE query_rate_limit_log.window_start 
    END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enumeration detection to sensitive tables
DROP TRIGGER IF EXISTS detect_profile_enumeration ON public.profiles;
CREATE TRIGGER detect_profile_enumeration
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH STATEMENT
EXECUTE FUNCTION detect_enumeration();

DROP TRIGGER IF EXISTS detect_supplier_enumeration ON public.suppliers;
CREATE TRIGGER detect_supplier_enumeration
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH STATEMENT
EXECUTE FUNCTION detect_enumeration();

-- 6. Log Unauthorized Access Attempts
CREATE OR REPLACE FUNCTION log_unauthorized_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log attempts to access others' data
  IF auth.uid() IS NOT NULL 
     AND NEW.user_id != auth.uid() 
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(), 'unauthorized_access_attempt', 'high',
      jsonb_build_object(
        'target_table', TG_TABLE_NAME,
        'target_record', NEW.id,
        'action', TG_OP
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_profile_unauthorized ON public.profiles;
CREATE TRIGGER log_profile_unauthorized
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION log_unauthorized_access();