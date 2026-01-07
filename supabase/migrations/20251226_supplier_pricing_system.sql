-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   💰 SUPPLIER PRICING SYSTEM - DATABASE SCHEMA                                       ║
-- ║                                                                                      ║
-- ║   ⚠️⚠️⚠️  CRITICAL DATABASE MIGRATION - DO NOT MODIFY  ⚠️⚠️⚠️                        ║
-- ║                                                                                      ║
-- ║   CREATED: December 26, 2025                                                         ║
-- ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
-- ║                                                                                      ║
-- ║   WORKFLOW:                                                                          ║
-- ║   1. ADMIN uploads product images via admin_material_images table                   ║
-- ║   2. SUPPLIER sets prices via supplier_product_prices table                         ║
-- ║   3. SUPPLIER can request new products via product_requests table                   ║
-- ║   4. ADMIN reviews requests and uploads new products                                ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Table 1: Supplier Product Prices
-- Stores the prices each supplier sets for admin-uploaded products
CREATE TABLE IF NOT EXISTS supplier_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  product_id UUID NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, product_id)
);

-- Table 2: Product Requests
-- Stores supplier requests for new products to be added by admin
CREATE TABLE IF NOT EXISTS product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  suggested_price DECIMAL(12, 2),
  image_data TEXT, -- Base64 encoded image
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE supplier_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Suppliers can view own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can insert own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can update own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Anyone can view product prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can view own requests" ON product_requests;
DROP POLICY IF EXISTS "Suppliers can insert requests" ON product_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON product_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON product_requests;

-- Policies for supplier_product_prices
CREATE POLICY "Anyone can view product prices"
ON supplier_product_prices FOR SELECT
USING (true);

CREATE POLICY "Suppliers can insert own prices"
ON supplier_product_prices FOR INSERT
WITH CHECK (true); -- Allow any insert (supplier_id checked in app)

CREATE POLICY "Suppliers can update own prices"
ON supplier_product_prices FOR UPDATE
USING (true); -- Allow any update (supplier_id checked in app)

-- Policies for product_requests
CREATE POLICY "Anyone can view requests"
ON product_requests FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert requests"
ON product_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update requests"
ON product_requests FOR UPDATE
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier ON supplier_product_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_product ON supplier_product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_supplier ON product_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);

-- Grant permissions
GRANT ALL ON supplier_product_prices TO authenticated;
GRANT SELECT ON supplier_product_prices TO anon;
GRANT ALL ON product_requests TO authenticated;
GRANT SELECT, INSERT ON product_requests TO anon;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_supplier_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_supplier_prices_updated_at ON supplier_product_prices;
CREATE TRIGGER trigger_supplier_prices_updated_at
  BEFORE UPDATE ON supplier_product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_prices_updated_at();








