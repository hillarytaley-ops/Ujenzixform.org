-- First, let's update the projects table to have better builder access control
-- Add a policy that allows builders to see projects where they have deliveries assigned
DROP POLICY IF EXISTS "Users can view projects they own or are admin" ON public.projects;

CREATE POLICY "Users can view projects they have access to"
ON public.projects
FOR SELECT
USING (
  -- Project owners can see their projects
  owner_id = auth.uid() OR
  -- Admins can see all projects
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR
  -- Builders can see projects where they have deliveries assigned
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'builder'
    ) AND
    EXISTS (
      SELECT 1 FROM public.deliveries
      WHERE project_id = projects.id AND builder_id = auth.uid()
    )
  ) OR
  -- Suppliers can see projects where they have deliveries
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'supplier'
    ) AND
    EXISTS (
      SELECT 1 FROM public.deliveries
      WHERE project_id = projects.id AND supplier_id = auth.uid()
    )
  )
);

-- Update deliveries policies to be more specific about builder access
-- Drop and recreate the builder policy for deliveries
DROP POLICY IF EXISTS "Builders can view their assigned deliveries" ON public.deliveries;

CREATE POLICY "Builders can view their assigned deliveries"
ON public.deliveries
FOR SELECT
USING (
  has_role(auth.uid(), 'builder'::app_role) AND 
  (
    auth.uid() = builder_id OR
    -- Builders can see deliveries in projects where they have other deliveries assigned
    (
      project_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.deliveries d2
        WHERE d2.project_id = deliveries.project_id 
        AND d2.builder_id = auth.uid()
      )
    )
  )
);

-- Update delivery updates policy for builders
DROP POLICY IF EXISTS "Users can view updates for their deliveries" ON public.delivery_updates;

CREATE POLICY "Users can view updates for their deliveries"
ON public.delivery_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM deliveries
    WHERE deliveries.id = delivery_updates.delivery_id 
    AND (
      deliveries.supplier_id = auth.uid() OR
      deliveries.builder_id = auth.uid() OR
      -- Builders can see updates for deliveries in their projects
      (
        deliveries.project_id IS NOT NULL AND
        has_role(auth.uid(), 'builder'::app_role) AND
        EXISTS (
          SELECT 1 FROM public.deliveries d2
          WHERE d2.project_id = deliveries.project_id 
          AND d2.builder_id = auth.uid()
        )
      )
    )
  )
);