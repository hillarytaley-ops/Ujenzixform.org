-- Drop existing trigger first to avoid conflicts
DROP TRIGGER IF EXISTS generate_delivery_tracking_number ON deliveries;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Create QR code functionality for materials tracking
CREATE TABLE IF NOT EXISTS public.material_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL,
  material_type text NOT NULL,
  batch_number text,
  supplier_id uuid REFERENCES profiles(id),
  purchase_order_id uuid,
  quantity integer NOT NULL,
  unit text DEFAULT 'pieces',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'received', 'verified')),
  generated_at timestamp with time zone DEFAULT now(),
  dispatched_at timestamp with time zone,
  received_at timestamp with time zone,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for material QR codes
CREATE POLICY "Suppliers can manage their QR codes"
ON public.material_qr_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = material_qr_codes.supplier_id)
  )
);

CREATE POLICY "Staff can scan and verify QR codes"
ON public.material_qr_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'builder')
  )
);

-- Create function to generate QR code for materials
CREATE OR REPLACE FUNCTION public.generate_material_qr_code(
  _material_type text,
  _batch_number text DEFAULT NULL,
  _supplier_id uuid DEFAULT NULL,
  _purchase_order_id uuid DEFAULT NULL,
  _quantity integer DEFAULT 1,
  _unit text DEFAULT 'pieces'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _qr_code text;
  _supplier_profile_id uuid;
BEGIN
  -- Get supplier profile ID if not provided
  IF _supplier_id IS NULL THEN
    SELECT id INTO _supplier_profile_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  ELSE
    _supplier_profile_id := _supplier_id;
  END IF;

  -- Generate unique QR code
  _qr_code := 'UJP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Insert QR code record
  INSERT INTO public.material_qr_codes (
    qr_code, material_type, batch_number, supplier_id, 
    purchase_order_id, quantity, unit
  ) VALUES (
    _qr_code, _material_type, _batch_number, _supplier_profile_id,
    _purchase_order_id, _quantity, _unit
  );
  
  RETURN _qr_code;
END;
$$;

-- Create function to update QR code status
CREATE OR REPLACE FUNCTION public.update_qr_status(
  _qr_code text,
  _new_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.material_qr_codes 
  SET 
    status = _new_status,
    dispatched_at = CASE WHEN _new_status = 'dispatched' THEN now() ELSE dispatched_at END,
    received_at = CASE WHEN _new_status = 'received' THEN now() ELSE received_at END,
    verified_at = CASE WHEN _new_status = 'verified' THEN now() ELSE verified_at END,
    updated_at = now()
  WHERE qr_code = _qr_code;
  
  RETURN FOUND;
END;
$$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_material_qr_codes_updated_at
  BEFORE UPDATE ON public.material_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();