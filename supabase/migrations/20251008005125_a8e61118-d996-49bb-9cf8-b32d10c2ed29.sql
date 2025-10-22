-- =====================================================
-- SECURITY FIX: Anonymous Blocking & Access Control
-- =====================================================

-- 1. PROFILES: Block Anonymous + Enumeration Protection
DROP POLICY IF EXISTS "profiles_deny_anonymous" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_or_admin_select_only" ON public.profiles;

CREATE POLICY "profiles_deny_anonymous"
ON public.profiles FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "profiles_self_or_admin_select_only"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. DELIVERIES: Direct Involvement Only
DROP POLICY IF EXISTS "deliveries_supplier_active_only" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_supplier_direct_only" ON public.deliveries;

CREATE POLICY "deliveries_supplier_direct_only"
ON public.deliveries FOR SELECT TO authenticated
USING (
  supplier_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = deliveries.supplier_id AND s.user_id = auth.uid()
  )
);

-- 3. SUPPLIERS: Block Anonymous
DROP POLICY IF EXISTS "suppliers_anonymous_block" ON public.suppliers;

CREATE POLICY "suppliers_anonymous_block"
ON public.suppliers FOR ALL TO anon
USING (false) WITH CHECK (false);

-- 4. Delivery Address Logging
CREATE OR REPLACE FUNCTION log_delivery_address_access()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action, sensitive_fields_accessed
  ) VALUES (
    auth.uid(), NEW.id, 'delivery', TG_OP, 
    ARRAY['pickup_address', 'delivery_address']
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_delivery_address_access_trigger ON public.deliveries;
CREATE TRIGGER log_delivery_address_access_trigger
AFTER INSERT OR UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION log_delivery_address_access();

-- 5. Rate Limiting (if not exists)
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

DROP POLICY IF EXISTS "rate_limit_admin_only" ON public.query_rate_limit_log;
CREATE POLICY "rate_limit_admin_only"
ON public.query_rate_limit_log FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Enumeration Detection
CREATE OR REPLACE FUNCTION detect_enumeration()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE recent_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(query_count, 0) INTO recent_count
  FROM query_rate_limit_log
  WHERE user_id = auth.uid() AND table_name = TG_TABLE_NAME
  AND window_start > NOW() - INTERVAL '1 minute';
  
  IF recent_count > 50 THEN
    INSERT INTO security_events (user_id, event_type, severity, details)
    VALUES (auth.uid(), 'potential_data_enumeration', 'critical',
      jsonb_build_object('table', TG_TABLE_NAME, 'queries', recent_count + 1));
  END IF;
  
  INSERT INTO query_rate_limit_log (user_id, table_name, query_count)
  VALUES (auth.uid(), TG_TABLE_NAME, 1)
  ON CONFLICT (user_id, table_name) DO UPDATE SET 
    query_count = CASE WHEN query_rate_limit_log.window_start < NOW() - INTERVAL '1 minute' 
      THEN 1 ELSE query_rate_limit_log.query_count + 1 END,
    window_start = CASE WHEN query_rate_limit_log.window_start < NOW() - INTERVAL '1 minute' 
      THEN NOW() ELSE query_rate_limit_log.window_start END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS track_profile_queries ON public.profiles;
CREATE TRIGGER track_profile_queries
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH STATEMENT EXECUTE FUNCTION detect_enumeration();

DROP TRIGGER IF EXISTS track_supplier_queries ON public.suppliers;
CREATE TRIGGER track_supplier_queries
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH STATEMENT EXECUTE FUNCTION detect_enumeration();