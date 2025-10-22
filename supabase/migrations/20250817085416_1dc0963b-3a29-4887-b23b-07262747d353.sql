-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Add project_id to deliveries table
ALTER TABLE public.deliveries ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Create index for better performance
CREATE INDEX idx_deliveries_project_id ON public.deliveries(project_id);

-- Add trigger for updating projects timestamp
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_delivery_timestamp();

-- Create policies for projects (without circular dependencies)
CREATE POLICY "Users can view projects they own or are admin"
ON public.projects
FOR SELECT
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins and owners can manage projects"
ON public.projects
FOR ALL
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);