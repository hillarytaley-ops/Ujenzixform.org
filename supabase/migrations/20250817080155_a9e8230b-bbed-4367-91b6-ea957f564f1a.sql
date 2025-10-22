-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('supplier', 'builder', 'admin');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update delivery policies to be role-based
DROP POLICY IF EXISTS "Suppliers can view and manage their deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Builders can view their deliveries" ON public.deliveries;

-- Suppliers can manage their own deliveries
CREATE POLICY "Suppliers can manage their deliveries" 
ON public.deliveries 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'supplier') AND 
  auth.uid() = supplier_id
);

-- Builders can view deliveries assigned to them
CREATE POLICY "Builders can view their assigned deliveries" 
ON public.deliveries 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'builder') AND 
  auth.uid() = builder_id
);

-- Update delivery_updates policies
DROP POLICY IF EXISTS "Suppliers can add updates to their deliveries" ON public.delivery_updates;

CREATE POLICY "Suppliers can manage updates for their deliveries" 
ON public.delivery_updates 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'supplier') AND
  EXISTS (
    SELECT 1 FROM public.deliveries 
    WHERE deliveries.id = delivery_updates.delivery_id 
    AND deliveries.supplier_id = auth.uid()
  )
);