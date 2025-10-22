-- Enhanced QR Code System: Auto-generation per item with dual scanning workflow

-- Create scan events table for tracking all QR scans
CREATE TABLE IF NOT EXISTS public.qr_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('dispatch', 'receiving', 'verification')),
  scanned_by UUID REFERENCES auth.users(id),
  scanner_device_id TEXT,
  scanner_type TEXT CHECK (scanner_type IN ('mobile_camera', 'physical_scanner', 'web_scanner')),
  scan_location JSONB,
  material_condition TEXT,
  quantity_scanned INTEGER,
  notes TEXT,
  photo_url TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on scan events
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;

-- Admin-only access to scan events
CREATE POLICY "Admin can view all scan events"
ON public.qr_scan_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to insert their own scans
CREATE POLICY "Users can insert their own scans"
ON public.qr_scan_events
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  scanned_by = auth.uid()
);

-- Create material_items table for individual item tracking
CREATE TABLE IF NOT EXISTS public.material_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL,
  item_sequence INTEGER NOT NULL,
  material_type TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  batch_number TEXT,
  supplier_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'in_transit', 'received', 'verified', 'damaged')),
  dispatch_scan_id UUID REFERENCES public.qr_scan_events(id),
  receiving_scan_id UUID REFERENCES public.qr_scan_events(id),
  verification_scan_id UUID REFERENCES public.qr_scan_events(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(purchase_order_id, item_sequence)
);

-- Enable RLS on material items
ALTER TABLE public.material_items ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin can manage all material items"
ON public.material_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Suppliers can view their items
CREATE POLICY "Suppliers can view their material items"
ON public.material_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid()
    AND s.id = material_items.supplier_id
  )
);

-- Builders can view items from their purchase orders
CREATE POLICY "Builders can view their ordered items"
ON public.material_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE p.user_id = auth.uid()
    AND po.id = material_items.purchase_order_id
  )
);

-- Function to auto-generate unique QR codes for each item in a purchase order
CREATE OR REPLACE FUNCTION public.auto_generate_item_qr_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  item_index INTEGER := 0;
  qr_code_value TEXT;
  supplier_uuid UUID;
  material_category TEXT;
BEGIN
  -- Get supplier ID from purchase order
  SELECT po.supplier_id INTO supplier_uuid
  FROM purchase_orders po
  WHERE po.id = NEW.id;

  -- Only generate QR codes when PO is confirmed and not already generated
  IF NEW.status = 'confirmed' AND (OLD.qr_code_generated IS FALSE OR OLD.qr_code_generated IS NULL) THEN
    -- Loop through each item in the purchase order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_index := item_index + 1;
      
      -- Extract material category (first word of material name)
      material_category := UPPER(SPLIT_PART(item->>'name', ' ', 1));
      
      -- Generate unique QR code: UJP-CATEGORY-PONUM-ITEM-DATE-RANDOM
      qr_code_value := 'UJP-' || 
                       material_category || '-' ||
                       NEW.po_number || '-' ||
                       'ITEM' || LPAD(item_index::TEXT, 3, '0') || '-' ||
                       TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Insert individual material item with QR code
      INSERT INTO public.material_items (
        purchase_order_id,
        qr_code,
        item_sequence,
        material_type,
        category,
        quantity,
        unit,
        supplier_id,
        status
      ) VALUES (
        NEW.id,
        qr_code_value,
        item_index,
        item->>'name',
        material_category,
        (item->>'quantity')::NUMERIC,
        COALESCE(item->>'unit', 'units'),
        supplier_uuid,
        'pending'
      );
      
      RAISE NOTICE 'Generated QR code % for item % in PO %', qr_code_value, item->>'name', NEW.po_number;
    END LOOP;
    
    -- Mark QR codes as generated
    NEW.qr_code_generated := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON purchase_orders;

-- Create trigger to auto-generate QR codes
CREATE TRIGGER trigger_auto_generate_item_qr_codes
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

-- Function to record QR scan with validation
CREATE OR REPLACE FUNCTION public.record_qr_scan(
  _qr_code TEXT,
  _scan_type TEXT,
  _scanner_device_id TEXT DEFAULT NULL,
  _scanner_type TEXT DEFAULT 'web_scanner',
  _scan_location JSONB DEFAULT NULL,
  _material_condition TEXT DEFAULT 'good',
  _quantity_scanned INTEGER DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scan_event_id UUID;
  item_record RECORD;
  result JSONB;
BEGIN
  -- Verify QR code exists
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found',
      'qr_code', _qr_code
    );
  END IF;
  
  -- Insert scan event
  INSERT INTO qr_scan_events (
    qr_code,
    scan_type,
    scanned_by,
    scanner_device_id,
    scanner_type,
    scan_location,
    material_condition,
    quantity_scanned,
    notes,
    photo_url
  ) VALUES (
    _qr_code,
    _scan_type,
    auth.uid(),
    _scanner_device_id,
    _scanner_type,
    _scan_location,
    _material_condition,
    _quantity_scanned,
    _notes,
    _photo_url
  ) RETURNING id INTO scan_event_id;
  
  -- Update material item status and link scan
  IF _scan_type = 'dispatch' THEN
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id,
        updated_at = now()
    WHERE qr_code = _qr_code;
  ELSIF _scan_type = 'receiving' THEN
    UPDATE material_items
    SET status = 'received',
        receiving_scan_id = scan_event_id,
        updated_at = now()
    WHERE qr_code = _qr_code;
  ELSIF _scan_type = 'verification' THEN
    UPDATE material_items
    SET status = 'verified',
        verification_scan_id = scan_event_id,
        updated_at = now()
    WHERE qr_code = _qr_code;
  END IF;
  
  -- Return success with item details
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', _qr_code,
    'material_type', item_record.material_type,
    'category', item_record.category,
    'quantity', item_record.quantity,
    'unit', item_record.unit,
    'previous_status', item_record.status,
    'new_status', CASE 
      WHEN _scan_type = 'dispatch' THEN 'dispatched'
      WHEN _scan_type = 'receiving' THEN 'received'
      WHEN _scan_type = 'verification' THEN 'verified'
      ELSE item_record.status
    END
  );
END;
$$;

-- Function for admin to get comprehensive scan statistics
CREATE OR REPLACE FUNCTION public.get_scan_statistics(
  _start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  _end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  _supplier_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_items BIGINT,
  pending_items BIGINT,
  dispatched_items BIGINT,
  received_items BIGINT,
  verified_items BIGINT,
  damaged_items BIGINT,
  total_scans BIGINT,
  dispatch_scans BIGINT,
  receiving_scans BIGINT,
  verification_scans BIGINT,
  avg_dispatch_to_receive_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access statistics
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(DISTINCT mi.id)::BIGINT as total_items,
    COUNT(DISTINCT CASE WHEN mi.status = 'pending' THEN mi.id END)::BIGINT as pending_items,
    COUNT(DISTINCT CASE WHEN mi.status = 'dispatched' THEN mi.id END)::BIGINT as dispatched_items,
    COUNT(DISTINCT CASE WHEN mi.status = 'received' THEN mi.id END)::BIGINT as received_items,
    COUNT(DISTINCT CASE WHEN mi.status = 'verified' THEN mi.id END)::BIGINT as verified_items,
    COUNT(DISTINCT CASE WHEN mi.status = 'damaged' THEN mi.id END)::BIGINT as damaged_items,
    COUNT(qse.id)::BIGINT as total_scans,
    COUNT(CASE WHEN qse.scan_type = 'dispatch' THEN 1 END)::BIGINT as dispatch_scans,
    COUNT(CASE WHEN qse.scan_type = 'receiving' THEN 1 END)::BIGINT as receiving_scans,
    COUNT(CASE WHEN qse.scan_type = 'verification' THEN 1 END)::BIGINT as verification_scans,
    AVG(
      EXTRACT(EPOCH FROM (rs.scanned_at - ds.scanned_at)) / 3600
    )::NUMERIC as avg_dispatch_to_receive_hours
  FROM material_items mi
  LEFT JOIN qr_scan_events qse ON qse.qr_code = mi.qr_code
  LEFT JOIN qr_scan_events ds ON ds.id = mi.dispatch_scan_id
  LEFT JOIN qr_scan_events rs ON rs.id = mi.receiving_scan_id
  WHERE
    (_start_date IS NULL OR mi.created_at >= _start_date) AND
    (_end_date IS NULL OR mi.created_at <= _end_date) AND
    (_supplier_id IS NULL OR mi.supplier_id = _supplier_id);
END;
$$;

-- Create updated_at trigger for material_items
CREATE TRIGGER update_material_items_updated_at
  BEFORE UPDATE ON public.material_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_items_qr_code ON public.material_items(qr_code);
CREATE INDEX IF NOT EXISTS idx_material_items_po_id ON public.material_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_material_items_status ON public.material_items(status);
CREATE INDEX IF NOT EXISTS idx_material_items_supplier_id ON public.material_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_qr_code ON public.qr_scan_events(qr_code);
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_scan_type ON public.qr_scan_events(scan_type);
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_scanned_at ON public.qr_scan_events(scanned_at);