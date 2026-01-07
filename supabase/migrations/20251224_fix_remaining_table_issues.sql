-- =====================================================================
-- FIX REMAINING DATABASE TABLE ISSUES
-- =====================================================================
-- This migration fixes 400 errors from the following tables:
-- 1. activity_logs - missing columns
-- 2. invoices - missing table
-- 3. suppliers - missing 'status' column  
-- 4. purchase_orders - potential column issues
-- =====================================================================

-- =====================================================================
-- SECTION 1: Fix activity_logs table completely
-- =====================================================================
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    -- Create the table from scratch
    CREATE TABLE public.activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      user_email TEXT,
      action TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'system',
      details TEXT DEFAULT '',
      metadata JSONB DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created activity_logs table';
  ELSE
    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'category') THEN
      ALTER TABLE public.activity_logs ADD COLUMN category TEXT NOT NULL DEFAULT 'system';
      RAISE NOTICE 'Added category column to activity_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'details') THEN
      ALTER TABLE public.activity_logs ADD COLUMN details TEXT DEFAULT '';
      RAISE NOTICE 'Added details column to activity_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'metadata') THEN
      ALTER TABLE public.activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
      RAISE NOTICE 'Added metadata column to activity_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'ip_address') THEN
      ALTER TABLE public.activity_logs ADD COLUMN ip_address TEXT;
      RAISE NOTICE 'Added ip_address column to activity_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'user_agent') THEN
      ALTER TABLE public.activity_logs ADD COLUMN user_agent TEXT;
      RAISE NOTICE 'Added user_agent column to activity_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'user_email') THEN
      ALTER TABLE public.activity_logs ADD COLUMN user_email TEXT;
      RAISE NOTICE 'Added user_email column to activity_logs';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing activity_logs: %', SQLERRM;
END $$;

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_all" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow users to view their own logs" ON public.activity_logs;

CREATE POLICY "activity_logs_select_policy"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);

CREATE POLICY "activity_logs_insert_policy"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

-- =====================================================================
-- SECTION 2: Create invoices table if missing
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    CREATE TABLE public.invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      builder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      order_id UUID,
      invoice_number TEXT UNIQUE,
      amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(12, 2) DEFAULT 0,
      total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'draft')),
      due_date TIMESTAMPTZ,
      paid_date TIMESTAMPTZ,
      notes TEXT,
      items JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_invoices_builder_id ON public.invoices(builder_id);
    CREATE INDEX idx_invoices_supplier_id ON public.invoices(supplier_id);
    CREATE INDEX idx_invoices_status ON public.invoices(status);
    CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);
    
    RAISE NOTICE 'Created invoices table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating invoices table: %', SQLERRM;
END $$;

-- Enable RLS on invoices
DO $$
BEGIN
  ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on invoices: %', SQLERRM;
END $$;

-- Create RLS policies for invoices
DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

DO $$
BEGIN
  -- Users can view their own invoices (as builder or supplier)
  CREATE POLICY "invoices_select_policy"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    builder_id = auth.uid() 
    OR supplier_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

  -- Suppliers and admins can create invoices
  CREATE POLICY "invoices_insert_policy"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    supplier_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

  -- Owners and admins can update invoices
  CREATE POLICY "invoices_update_policy"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    supplier_id = auth.uid()
    OR builder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating invoices policies: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;

-- =====================================================================
-- SECTION 3: Fix suppliers table - add status column if missing
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'status') THEN
      ALTER TABLE public.suppliers ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
      RAISE NOTICE 'Added status column to suppliers table';
    END IF;
    
    -- Add rating column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'rating') THEN
      ALTER TABLE public.suppliers ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0;
      RAISE NOTICE 'Added rating column to suppliers table';
    END IF;
    
    -- Add location column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'location') THEN
      ALTER TABLE public.suppliers ADD COLUMN location TEXT;
      RAISE NOTICE 'Added location column to suppliers table';
    END IF;
  ELSE
    -- Create suppliers table if it doesn't exist
    CREATE TABLE public.suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      location TEXT,
      address TEXT,
      description TEXT,
      logo_url TEXT,
      rating DECIMAL(3, 2) DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
      is_verified BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);
    CREATE INDEX idx_suppliers_status ON public.suppliers(status);
    CREATE INDEX idx_suppliers_rating ON public.suppliers(rating DESC);
    
    RAISE NOTICE 'Created suppliers table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing suppliers table: %', SQLERRM;
END $$;

-- Enable RLS on suppliers
DO $$
BEGIN
  ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on suppliers: %', SQLERRM;
END $$;

-- Create RLS policies for suppliers
DROP POLICY IF EXISTS "suppliers_select_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON public.suppliers;

DO $$
BEGIN
  -- Anyone can view active suppliers
  CREATE POLICY "suppliers_select_policy"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

  -- Users can create their own supplier profile
  CREATE POLICY "suppliers_insert_policy"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

  -- Owners and admins can update
  CREATE POLICY "suppliers_update_policy"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating suppliers policies: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;

-- =====================================================================
-- SECTION 4: Fix purchase_orders table
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchase_orders') THEN
    -- Add supplier_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'supplier_id') THEN
      ALTER TABLE public.purchase_orders ADD COLUMN supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added supplier_id column to purchase_orders';
    END IF;
    
    -- Add project_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'project_name') THEN
      ALTER TABLE public.purchase_orders ADD COLUMN project_name TEXT;
      RAISE NOTICE 'Added project_name column to purchase_orders';
    END IF;
  ELSE
    -- Create purchase_orders table if it doesn't exist
    CREATE TABLE public.purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      builder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      project_name TEXT,
      order_number TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled', 'processing')),
      total_amount DECIMAL(12, 2) DEFAULT 0,
      notes TEXT,
      delivery_address TEXT,
      delivery_date TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_purchase_orders_builder_id ON public.purchase_orders(builder_id);
    CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
    CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
    CREATE INDEX idx_purchase_orders_created_at ON public.purchase_orders(created_at DESC);
    
    RAISE NOTICE 'Created purchase_orders table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing purchase_orders table: %', SQLERRM;
END $$;

-- Enable RLS on purchase_orders
DO $$
BEGIN
  ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on purchase_orders: %', SQLERRM;
END $$;

-- Create RLS policies for purchase_orders
DROP POLICY IF EXISTS "purchase_orders_select_policy" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert_policy" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update_policy" ON public.purchase_orders;

DO $$
BEGIN
  -- Users can view their own orders
  CREATE POLICY "purchase_orders_select_policy"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR supplier_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

  -- Builders can create orders
  CREATE POLICY "purchase_orders_insert_policy"
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (builder_id = auth.uid());

  -- Owners and admins can update
  CREATE POLICY "purchase_orders_update_policy"
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR supplier_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating purchase_orders policies: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;

-- =====================================================================
-- SECTION 5: Create order_items table if missing
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    CREATE TABLE public.order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
      material_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT,
      unit_price DECIMAL(12, 2) DEFAULT 0,
      total_price DECIMAL(12, 2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
    
    RAISE NOTICE 'Created order_items table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating order_items table: %', SQLERRM;
END $$;

-- Enable RLS on order_items
DO $$
BEGIN
  ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on order_items: %', SQLERRM;
END $$;

-- Create RLS policies for order_items
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;

DO $$
BEGIN
  -- Users can view items for their orders
  CREATE POLICY "order_items_select_policy"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = order_id 
      AND (po.builder_id = auth.uid() OR po.supplier_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

  -- Users can add items to their orders
  CREATE POLICY "order_items_insert_policy"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = order_id 
      AND po.builder_id = auth.uid()
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating order_items policies: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- =====================================================================
-- SECTION 6: Create quote_requests table if missing
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quote_requests') THEN
    CREATE TABLE public.quote_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
      supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'accepted', 'rejected', 'expired')),
      quoted_amount DECIMAL(12, 2),
      response_notes TEXT,
      responded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_quote_requests_order_id ON public.quote_requests(order_id);
    CREATE INDEX idx_quote_requests_supplier_id ON public.quote_requests(supplier_id);
    CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
    
    RAISE NOTICE 'Created quote_requests table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating quote_requests table: %', SQLERRM;
END $$;

-- Enable RLS on quote_requests
DO $$
BEGIN
  ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on quote_requests: %', SQLERRM;
END $$;

-- Create RLS policies for quote_requests
DROP POLICY IF EXISTS "quote_requests_select_policy" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_insert_policy" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_update_policy" ON public.quote_requests;

DO $$
BEGIN
  -- Users can view their quote requests
  CREATE POLICY "quote_requests_select_policy"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (
    supplier_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = order_id AND po.builder_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

  -- Builders can create quote requests
  CREATE POLICY "quote_requests_insert_policy"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = order_id AND po.builder_id = auth.uid()
    )
  );

  -- Suppliers can update their responses
  CREATE POLICY "quote_requests_update_policy"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (supplier_id = auth.uid());
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating quote_requests policies: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.quote_requests TO authenticated;

-- =====================================================================
-- SUMMARY
-- =====================================================================
/*
This migration fixes the following 400 errors:

1. ✅ activity_logs - Added missing columns (category, details, metadata, etc.)
2. ✅ invoices - Created table with proper schema and RLS
3. ✅ suppliers - Added missing 'status', 'rating', 'location' columns
4. ✅ purchase_orders - Added missing columns and fixed RLS
5. ✅ order_items - Created table for purchase order line items
6. ✅ quote_requests - Created table for quote request tracking

To apply this migration:
1. Go to Supabase Dashboard → SQL Editor
2. Paste this entire file
3. Click "Run"
4. Refresh the page to verify errors are resolved
*/

