-- Create delivery note signing functionality
CREATE TABLE delivery_note_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id),
  signer_id UUID NOT NULL REFERENCES profiles(id),
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for delivery note signatures
ALTER TABLE delivery_note_signatures ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery note signatures
CREATE POLICY "Professional builders and companies can sign delivery notes"
ON delivery_note_signatures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_note_signatures.signer_id 
    AND role = 'builder' 
    AND (user_type = 'company' OR is_professional = true)
  )
);

CREATE POLICY "Users can view their own signatures"
ON delivery_note_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (id = delivery_note_signatures.signer_id OR role = 'admin')
  )
);

-- Create invoices table for professional builders/companies
CREATE TABLE invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  issuer_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  due_date DATE,
  notes TEXT,
  custom_invoice_path TEXT, -- for uploaded custom invoices
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Professional builders and companies can manage their invoices"
ON invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND id = invoices.issuer_id 
    AND role = 'builder' 
    AND (user_type = 'company' OR is_professional = true)
  )
);

CREATE POLICY "Suppliers can view invoices sent to them"
ON invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN profiles p ON p.id = s.user_id
    WHERE p.user_id = auth.uid() 
    AND s.id = invoices.supplier_id
  )
);

-- Add delivery_required column to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN delivery_required BOOLEAN DEFAULT true,
ADD COLUMN delivery_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN delivery_notes TEXT;

-- Add delivery_required column to purchase_receipts (for private builders)
ALTER TABLE purchase_receipts 
ADD COLUMN delivery_required BOOLEAN DEFAULT true,
ADD COLUMN delivery_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN delivery_notes TEXT;

-- Create delivery notifications table
CREATE TABLE delivery_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('purchase_order', 'private_purchase')),
  request_id UUID NOT NULL, -- purchase_order_id or purchase_receipt_id
  builder_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_latitude NUMERIC,
  pickup_longitude NUMERIC,
  delivery_latitude NUMERIC,
  delivery_longitude NUMERIC,
  material_details JSONB NOT NULL DEFAULT '[]',
  special_instructions TEXT,
  priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
  notification_radius_km NUMERIC DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'assigned', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for delivery notifications
ALTER TABLE delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery notifications
CREATE POLICY "Builders can create delivery notifications"
ON delivery_notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_notifications.builder_id
  )
);

CREATE POLICY "Users can view relevant delivery notifications"
ON delivery_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN suppliers s ON s.user_id = p.id
    LEFT JOIN delivery_providers dp ON dp.user_id = p.id
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_notifications.builder_id OR
      s.id = delivery_notifications.supplier_id OR
      dp.id IS NOT NULL -- delivery providers can see notifications in their area
    )
  )
);

-- Create delivery provider responses table
CREATE TABLE delivery_provider_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES delivery_notifications(id),
  provider_id UUID NOT NULL REFERENCES delivery_providers(id),
  response TEXT NOT NULL CHECK (response IN ('accept', 'reject')),
  response_message TEXT,
  estimated_cost NUMERIC(10,2),
  estimated_duration_hours NUMERIC(4,2),
  distance_km NUMERIC(6,2),
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for delivery provider responses
ALTER TABLE delivery_provider_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery provider responses
CREATE POLICY "Providers can create their own responses"
ON delivery_provider_responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    JOIN profiles p ON p.id = dp.user_id
    WHERE p.user_id = auth.uid() 
    AND dp.id = delivery_provider_responses.provider_id
  )
);

CREATE POLICY "Users can view relevant provider responses"
ON delivery_provider_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN delivery_providers dp ON dp.user_id = p.id
    LEFT JOIN delivery_notifications dn ON dn.id = delivery_provider_responses.notification_id
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = dn.builder_id OR
      dp.id = delivery_provider_responses.provider_id
    )
  )
);

-- Add location tracking columns to delivery_providers
ALTER TABLE delivery_providers 
ADD COLUMN current_latitude NUMERIC,
ADD COLUMN current_longitude NUMERIC,
ADD COLUMN last_location_update TIMESTAMP WITH TIME ZONE;

-- Function to notify nearby delivery providers
CREATE OR REPLACE FUNCTION notify_nearby_delivery_providers(
  _notification_id UUID,
  _pickup_lat NUMERIC,
  _pickup_lng NUMERIC,
  _delivery_lat NUMERIC,
  _delivery_lng NUMERIC,
  _radius_km NUMERIC DEFAULT 25
)
RETURNS TABLE(provider_id UUID, distance_km NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate distance using Haversine formula approximation
  -- This is a simplified version - in production, use PostGIS for accurate calculations
  RETURN QUERY
  SELECT 
    dp.id,
    SQRT(
      POWER(69.1 * (_pickup_lat - COALESCE(dp.current_latitude, 0)), 2) +
      POWER(69.1 * (_pickup_lng - COALESCE(dp.current_longitude, 0)) * COS(_pickup_lat / 57.3), 2)
    ) as distance
  FROM delivery_providers dp
  WHERE dp.is_active = true 
    AND dp.is_verified = true
    AND SQRT(
      POWER(69.1 * (_pickup_lat - COALESCE(dp.current_latitude, 0)), 2) +
      POWER(69.1 * (_pickup_lng - COALESCE(dp.current_longitude, 0)) * COS(_pickup_lat / 57.3), 2)
    ) <= _radius_km
  ORDER BY distance ASC;
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_delivery_note_signatures_updated_at
BEFORE UPDATE ON delivery_note_signatures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_notifications_updated_at
BEFORE UPDATE ON delivery_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();