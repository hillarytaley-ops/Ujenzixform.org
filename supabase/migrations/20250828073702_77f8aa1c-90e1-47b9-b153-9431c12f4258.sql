-- Create purchase_receipts table for private builder direct purchases
CREATE TABLE public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  delivery_address TEXT,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for purchase receipts
CREATE POLICY "Private builders can create their own receipts"
ON public.purchase_receipts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND id = purchase_receipts.buyer_id 
    AND role = 'builder' 
    AND user_type = 'individual'
  )
);

CREATE POLICY "Private builders can view their own receipts"
ON public.purchase_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (
      id = purchase_receipts.buyer_id 
      OR role = 'admin'
    )
  )
);

CREATE POLICY "Suppliers can view receipts for their sales"
ON public.purchase_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN profiles p ON p.id = s.user_id
    WHERE p.user_id = auth.uid() 
    AND s.id = purchase_receipts.supplier_id
  )
);

-- Add missing columns to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create trigger for updating timestamps
CREATE TRIGGER update_purchase_receipts_updated_at
  BEFORE UPDATE ON public.purchase_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();