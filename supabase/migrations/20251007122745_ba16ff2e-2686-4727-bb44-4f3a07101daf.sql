-- Create security alerts table for automated monitoring
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  event_count INTEGER DEFAULT 0,
  description TEXT,
  related_events UUID[],
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only access to security alerts
CREATE POLICY "security_alerts_admin_only" ON public.security_alerts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity) WHERE NOT resolved;

-- Create trigger for updated_at
CREATE TRIGGER update_security_alerts_updated_at
  BEFORE UPDATE ON public.security_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.security_alerts IS 'Automated security alerts aggregated from security events';
