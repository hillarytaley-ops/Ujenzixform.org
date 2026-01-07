-- Create product_requests table for suppliers to request new products
-- This table stores requests from suppliers for admin to add new products

CREATE TABLE IF NOT EXISTS product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  suggested_price DECIMAL(10,2) DEFAULT 0,
  image_data TEXT, -- Base64 encoded image
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_requests ENABLE ROW LEVEL SECURITY;

-- Suppliers can insert their own requests
CREATE POLICY "Suppliers can create product requests"
  ON product_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supplier_id);

-- Suppliers can view their own requests
CREATE POLICY "Suppliers can view own requests"
  ON product_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id);

-- Admin can view all requests (using admin_staff check)
CREATE POLICY "Admin can view all product requests"
  ON product_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff WHERE id = auth.uid()
    )
  );

-- Admin can update any request
CREATE POLICY "Admin can update product requests"
  ON product_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff WHERE id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_supplier_id ON product_requests(supplier_id);

