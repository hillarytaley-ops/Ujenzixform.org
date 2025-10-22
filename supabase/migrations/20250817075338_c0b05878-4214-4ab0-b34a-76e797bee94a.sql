-- Create deliveries table
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES auth.users(id),
  builder_id UUID REFERENCES auth.users(id),
  material_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  weight_kg DECIMAL(10,2),
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled')),
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_number TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_updates table for tracking history
CREATE TABLE public.delivery_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for deliveries
CREATE POLICY "Suppliers can view and manage their deliveries" 
ON public.deliveries 
FOR ALL 
USING (auth.uid() = supplier_id);

CREATE POLICY "Builders can view their deliveries" 
ON public.deliveries 
FOR SELECT 
USING (auth.uid() = builder_id);

CREATE POLICY "Public can track deliveries with tracking number" 
ON public.deliveries 
FOR SELECT 
USING (true);

-- Create policies for delivery_updates
CREATE POLICY "Users can view updates for their deliveries" 
ON public.delivery_updates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries 
    WHERE deliveries.id = delivery_updates.delivery_id 
    AND (deliveries.supplier_id = auth.uid() OR deliveries.builder_id = auth.uid())
  )
);

CREATE POLICY "Suppliers can add updates to their deliveries" 
ON public.delivery_updates 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deliveries 
    WHERE deliveries.id = delivery_updates.delivery_id 
    AND deliveries.supplier_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_delivery_timestamp();

-- Create function to generate tracking numbers
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TRK' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for deliveries and updates
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_updates REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_updates;