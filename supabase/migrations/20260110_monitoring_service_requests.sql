-- =====================================================================
-- MONITORING SERVICE REQUESTS TABLE
-- Allows builders and private clients to request camera monitoring
-- =====================================================================

-- Create the monitoring_service_requests table
CREATE TABLE IF NOT EXISTS public.monitoring_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('professional_builder', 'private_client')),
  project_name TEXT NOT NULL,
  project_location TEXT NOT NULL,
  project_description TEXT,
  preferred_start_date DATE,
  number_of_cameras INTEGER DEFAULT 1,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
  admin_response TEXT,
  admin_id UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_requester ON public.monitoring_service_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_status ON public.monitoring_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_created ON public.monitoring_service_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.monitoring_service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own requests
DROP POLICY IF EXISTS "monitoring_requests_select_own" ON public.monitoring_service_requests;
CREATE POLICY "monitoring_requests_select_own" 
ON public.monitoring_service_requests 
FOR SELECT 
TO authenticated 
USING (requester_id = auth.uid());

-- Admins can view all requests
DROP POLICY IF EXISTS "monitoring_requests_admin_select" ON public.monitoring_service_requests;
CREATE POLICY "monitoring_requests_admin_select" 
ON public.monitoring_service_requests 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Users can insert their own requests
DROP POLICY IF EXISTS "monitoring_requests_insert_own" ON public.monitoring_service_requests;
CREATE POLICY "monitoring_requests_insert_own" 
ON public.monitoring_service_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (requester_id = auth.uid());

-- Users can update their own pending requests (cancel)
DROP POLICY IF EXISTS "monitoring_requests_update_own" ON public.monitoring_service_requests;
CREATE POLICY "monitoring_requests_update_own" 
ON public.monitoring_service_requests 
FOR UPDATE 
TO authenticated 
USING (requester_id = auth.uid() AND status = 'pending');

-- Admins can update any request
DROP POLICY IF EXISTS "monitoring_requests_admin_update" ON public.monitoring_service_requests;
CREATE POLICY "monitoring_requests_admin_update" 
ON public.monitoring_service_requests 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.monitoring_service_requests TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monitoring_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_monitoring_request_timestamp ON public.monitoring_service_requests;
CREATE TRIGGER update_monitoring_request_timestamp
  BEFORE UPDATE ON public.monitoring_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_request_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.monitoring_service_requests IS 'Stores requests from builders and private clients for site monitoring services';

