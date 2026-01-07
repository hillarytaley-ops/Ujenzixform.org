-- =====================================================================
-- CLEAN DATABASE FIX - SAFE MIGRATION v2
-- =====================================================================
-- Fixes all 400 errors by ensuring tables have correct columns
-- =====================================================================

-- =====================================================================
-- SECTION 1: ACTIVITY_LOGS - Add missing columns
-- =====================================================================
DO $$
BEGIN
  -- Create table if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    CREATE TABLE public.activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      user_email TEXT,
      action TEXT NOT NULL,
      category TEXT DEFAULT 'system',
      details TEXT DEFAULT '',
      metadata JSONB DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Add columns if missing (using separate statements to avoid errors)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='category') THEN
      ALTER TABLE public.activity_logs ADD COLUMN category TEXT DEFAULT 'system';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='details') THEN
      ALTER TABLE public.activity_logs ADD COLUMN details TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='metadata') THEN
      ALTER TABLE public.activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='ip_address') THEN
      ALTER TABLE public.activity_logs ADD COLUMN ip_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='user_agent') THEN
      ALTER TABLE public.activity_logs ADD COLUMN user_agent TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='user_email') THEN
      ALTER TABLE public.activity_logs ADD COLUMN user_email TEXT;
    END IF;
  END IF;
  
  -- Enable RLS
  ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'activity_logs table updated';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'activity_logs error: %', SQLERRM;
END $$;

-- Drop and recreate policies for activity_logs
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_all" ON public.activity_logs;

CREATE POLICY "activity_logs_select_policy" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

-- =====================================================================
-- SECTION 2: INVOICES - Add missing columns
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    CREATE TABLE public.invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      builder_id UUID,
      supplier_id UUID,
      order_id UUID,
      invoice_number TEXT,
      amount DECIMAL(12, 2) DEFAULT 0,
      tax_amount DECIMAL(12, 2) DEFAULT 0,
      total_amount DECIMAL(12, 2) DEFAULT 0,
      status TEXT DEFAULT 'pending',
      due_date TIMESTAMPTZ,
      paid_date TIMESTAMPTZ,
      notes TEXT,
      items JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='builder_id') THEN
      ALTER TABLE public.invoices ADD COLUMN builder_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='supplier_id') THEN
      ALTER TABLE public.invoices ADD COLUMN supplier_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='order_id') THEN
      ALTER TABLE public.invoices ADD COLUMN order_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='invoice_number') THEN
      ALTER TABLE public.invoices ADD COLUMN invoice_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='amount') THEN
      ALTER TABLE public.invoices ADD COLUMN amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='tax_amount') THEN
      ALTER TABLE public.invoices ADD COLUMN tax_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='total_amount') THEN
      ALTER TABLE public.invoices ADD COLUMN total_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='status') THEN
      ALTER TABLE public.invoices ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='items') THEN
      ALTER TABLE public.invoices ADD COLUMN items JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='metadata') THEN
      ALTER TABLE public.invoices ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
  END IF;
  
  ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'invoices table updated';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'invoices error: %', SQLERRM;
END $$;

-- Policies for invoices
DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

CREATE POLICY "invoices_select_policy" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert_policy" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update_policy" ON public.invoices FOR UPDATE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;

-- =====================================================================
-- SECTION 3: SUPPLIERS - Add missing columns
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
    CREATE TABLE public.suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      location TEXT,
      address TEXT,
      description TEXT,
      logo_url TEXT,
      rating DECIMAL(3, 2) DEFAULT 0,
      status TEXT DEFAULT 'active',
      is_verified BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='status') THEN
      ALTER TABLE public.suppliers ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='rating') THEN
      ALTER TABLE public.suppliers ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='location') THEN
      ALTER TABLE public.suppliers ADD COLUMN location TEXT;
    END IF;
  END IF;
  
  ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'suppliers table updated';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'suppliers error: %', SQLERRM;
END $$;

-- Policies for suppliers
DROP POLICY IF EXISTS "suppliers_select_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON public.suppliers;

CREATE POLICY "suppliers_select_policy" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert_policy" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "suppliers_update_policy" ON public.suppliers FOR UPDATE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;

-- =====================================================================
-- SECTION 4: PURCHASE_ORDERS - Add missing columns
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchase_orders') THEN
    CREATE TABLE public.purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      builder_id UUID,
      supplier_id UUID,
      project_name TEXT,
      order_number TEXT,
      status TEXT DEFAULT 'pending',
      total_amount DECIMAL(12, 2) DEFAULT 0,
      notes TEXT,
      delivery_address TEXT,
      delivery_date TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='supplier_id') THEN
      ALTER TABLE public.purchase_orders ADD COLUMN supplier_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='project_name') THEN
      ALTER TABLE public.purchase_orders ADD COLUMN project_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='builder_id') THEN
      ALTER TABLE public.purchase_orders ADD COLUMN builder_id UUID;
    END IF;
  END IF;
  
  ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'purchase_orders table updated';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'purchase_orders error: %', SQLERRM;
END $$;

-- Policies for purchase_orders
DROP POLICY IF EXISTS "purchase_orders_select_policy" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert_policy" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update_policy" ON public.purchase_orders;

CREATE POLICY "purchase_orders_select_policy" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_orders_insert_policy" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "purchase_orders_update_policy" ON public.purchase_orders FOR UPDATE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;

-- =====================================================================
-- SECTION 5: ORDER_ITEMS
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    CREATE TABLE public.order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID,
      material_name TEXT,
      category TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT,
      unit_price DECIMAL(12, 2) DEFAULT 0,
      total_price DECIMAL(12, 2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'order_items table ready';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'order_items error: %', SQLERRM;
END $$;

DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;

CREATE POLICY "order_items_select_policy" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert_policy" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- =====================================================================
-- SECTION 6: QUOTE_REQUESTS
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quote_requests') THEN
    CREATE TABLE public.quote_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID,
      supplier_id UUID,
      status TEXT DEFAULT 'pending',
      quoted_amount DECIMAL(12, 2),
      response_notes TEXT,
      responded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'quote_requests table ready';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'quote_requests error: %', SQLERRM;
END $$;

DROP POLICY IF EXISTS "quote_requests_select_policy" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_insert_policy" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_update_policy" ON public.quote_requests;

CREATE POLICY "quote_requests_select_policy" ON public.quote_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "quote_requests_insert_policy" ON public.quote_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "quote_requests_update_policy" ON public.quote_requests FOR UPDATE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.quote_requests TO authenticated;

-- =====================================================================
-- DONE
-- =====================================================================
