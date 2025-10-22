-- Create invoice_payments table for tracking payments
CREATE TABLE public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create purchase_receipts table for private builder receipts
CREATE TABLE public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL, -- Can be supplier ID or name for flexibility
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  delivery_address TEXT,
  special_instructions TEXT,
  delivery_required BOOLEAN DEFAULT true,
  delivery_requested_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'completed',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_payments
CREATE POLICY "Professional builders can view their invoice payments" 
ON public.invoice_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  JOIN public.profiles p ON p.id = i.issuer_id
  WHERE i.id = invoice_payments.invoice_id 
  AND p.user_id = auth.uid()
  AND p.role = 'builder'
  AND (p.user_type = 'company' OR p.is_professional = true)
));

CREATE POLICY "Professional builders can create payments for their invoices" 
ON public.invoice_payments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices i
  JOIN public.profiles p ON p.id = i.issuer_id
  WHERE i.id = invoice_payments.invoice_id 
  AND p.user_id = auth.uid()
  AND p.role = 'builder'
  AND (p.user_type = 'company' OR p.is_professional = true)
));

CREATE POLICY "Suppliers can view payments for invoices sent to them" 
ON public.invoice_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  JOIN public.suppliers s ON s.id = i.supplier_id
  JOIN public.profiles p ON p.id = s.user_id
  WHERE i.id = invoice_payments.invoice_id 
  AND p.user_id = auth.uid()
));

-- Policies for purchase_receipts
CREATE POLICY "Private builders can view their own receipts" 
ON public.purchase_receipts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = purchase_receipts.buyer_id 
  AND p.user_id = auth.uid()
  AND p.role = 'builder'
  AND p.user_type = 'individual'
));

CREATE POLICY "Private builders can create their own receipts" 
ON public.purchase_receipts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = purchase_receipts.buyer_id 
  AND p.user_id = auth.uid()
  AND p.role = 'builder'
  AND p.user_type = 'individual'
));

CREATE POLICY "Admins can view all receipts" 
ON public.purchase_receipts 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.user_id = auth.uid()
  AND p.role = 'admin'
));

-- Add update triggers
CREATE TRIGGER update_invoice_payments_updated_at
  BEFORE UPDATE ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_receipts_updated_at
  BEFORE UPDATE ON public.purchase_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();