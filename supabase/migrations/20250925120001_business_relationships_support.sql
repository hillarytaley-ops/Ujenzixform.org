-- ====================================================
-- BUSINESS RELATIONSHIPS SUPPORT TABLES
-- Required for legitimate business needs verification
-- ====================================================

-- Create business relationships table for tracking legitimate business connections
CREATE TABLE IF NOT EXISTS public.business_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'business_inquiry',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '6 months',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(requester_id, supplier_id)
);

-- Create projects table if it doesn't exist (for business relationship verification)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table if it doesn't exist (for business relationship verification)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  quote_request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all supporting tables
ALTER TABLE public.business_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_relationships
CREATE POLICY "business_relationships_admin_full_access" 
ON public.business_relationships FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "business_relationships_own_access" 
ON public.business_relationships FOR ALL
TO authenticated
USING (
  requester_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  requester_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
);

-- RLS policies for projects
CREATE POLICY "projects_admin_full_access" 
ON public.projects FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "projects_participant_access" 
ON public.projects FOR ALL
TO authenticated
USING (
  builder_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  builder_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
);

-- RLS policies for quotes
CREATE POLICY "quotes_admin_full_access" 
ON public.quotes FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "quotes_participant_access" 
ON public.quotes FOR ALL
TO authenticated
USING (
  requester_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  requester_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
);

-- Function to request business relationship
CREATE OR REPLACE FUNCTION public.request_business_relationship(
  target_supplier_id UUID,
  relationship_type TEXT DEFAULT 'business_inquiry',
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  relationship_id UUID;
  requesting_user_id UUID;
BEGIN
  requesting_user_id := auth.uid();
  
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to request business relationship';
  END IF;
  
  -- Check if relationship already exists
  SELECT id INTO relationship_id
  FROM business_relationships
  WHERE requester_id = requesting_user_id 
  AND supplier_id = target_supplier_id;
  
  IF relationship_id IS NOT NULL THEN
    -- Update existing relationship
    UPDATE business_relationships 
    SET 
      relationship_type = request_business_relationship.relationship_type,
      status = 'pending',
      metadata = request_business_relationship.metadata,
      updated_at = NOW(),
      expires_at = NOW() + INTERVAL '6 months'
    WHERE id = relationship_id;
  ELSE
    -- Create new relationship
    INSERT INTO business_relationships (
      requester_id,
      supplier_id,
      relationship_type,
      metadata
    ) VALUES (
      requesting_user_id,
      target_supplier_id,
      relationship_type,
      metadata
    ) RETURNING id INTO relationship_id;
  END IF;
  
  RETURN relationship_id;
END;
$$;

-- Function to approve business relationship (admin or supplier only)
CREATE OR REPLACE FUNCTION public.approve_business_relationship(
  relationship_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  current_user_id UUID;
  relationship_supplier_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to approve business relationship';
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = current_user_id;
  
  -- Get the supplier ID for this relationship
  SELECT supplier_id INTO relationship_supplier_id
  FROM business_relationships
  WHERE id = relationship_id;
  
  -- Check if user can approve (admin or supplier owner)
  IF user_role = 'admin' OR EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON p.id = s.user_id 
    WHERE s.id = relationship_supplier_id AND p.user_id = current_user_id
  ) THEN
    UPDATE business_relationships 
    SET 
      status = 'approved',
      approved_by = current_user_id,
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = relationship_id;
    
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to approve business relationship';
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.request_business_relationship(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_business_relationship(UUID) TO authenticated;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_business_relationships_requester ON public.business_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_business_relationships_supplier ON public.business_relationships(supplier_id);
CREATE INDEX IF NOT EXISTS idx_business_relationships_status ON public.business_relationships(status);
CREATE INDEX IF NOT EXISTS idx_projects_builder ON public.projects(builder_id);
CREATE INDEX IF NOT EXISTS idx_projects_supplier ON public.projects(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotes_requester ON public.quotes(requester_id);
CREATE INDEX IF NOT EXISTS idx_quotes_supplier ON public.quotes(supplier_id);

COMMENT ON TABLE public.business_relationships IS 'Tracks legitimate business relationships for supplier contact access verification';
COMMENT ON FUNCTION public.request_business_relationship(UUID, TEXT, JSONB) IS 'Request a business relationship with a supplier to access contact information';
COMMENT ON FUNCTION public.approve_business_relationship(UUID) IS 'Approve a business relationship request (admin or supplier only)';
