-- Scheduled Reports Table
-- Stores configuration for automated email reports

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  time TEXT NOT NULL DEFAULT '08:00',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  include_alerts BOOLEAN DEFAULT true,
  include_deliveries BOOLEAN DEFAULT true,
  include_cameras BOOLEAN DEFAULT true,
  include_analytics BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report execution log
CREATE TABLE IF NOT EXISTS scheduled_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  recipients_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved filters for analytics
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('alerts', 'deliveries', 'cameras', 'analytics')),
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_scheduled_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_scheduled_reports_timestamp ON scheduled_reports;
CREATE TRIGGER update_scheduled_reports_timestamp
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reports_timestamp();

DROP TRIGGER IF EXISTS update_saved_filters_timestamp ON saved_filters;
CREATE TRIGGER update_saved_filters_timestamp
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reports_timestamp();

-- RLS Policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Scheduled Reports: Admin only
CREATE POLICY "Admins can manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Report Logs: Admin only
CREATE POLICY "Admins can view report logs"
  ON scheduled_report_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Saved Filters: User owns their filters
CREATE POLICY "Users can manage their own filters"
  ON saved_filters FOR ALL
  USING (user_id = auth.uid());

-- Admins can see all filters
CREATE POLICY "Admins can view all filters"
  ON saved_filters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to get pending scheduled reports
CREATE OR REPLACE FUNCTION get_pending_scheduled_reports()
RETURNS SETOF scheduled_reports
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM scheduled_reports
  WHERE is_active = true
    AND (next_run_at IS NULL OR next_run_at <= NOW())
  ORDER BY next_run_at ASC;
$$;

-- Function to update next run time after execution
CREATE OR REPLACE FUNCTION update_report_next_run(
  p_report_id UUID,
  p_success BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report scheduled_reports%ROWTYPE;
  v_next_run TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_report FROM scheduled_reports WHERE id = p_report_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate next run time based on frequency
  CASE v_report.frequency
    WHEN 'daily' THEN
      v_next_run := NOW() + INTERVAL '1 day';
    WHEN 'weekly' THEN
      v_next_run := NOW() + INTERVAL '1 week';
    WHEN 'monthly' THEN
      v_next_run := NOW() + INTERVAL '1 month';
  END CASE;

  -- Update the report
  UPDATE scheduled_reports
  SET 
    last_sent_at = CASE WHEN p_success THEN NOW() ELSE last_sent_at END,
    next_run_at = v_next_run
  WHERE id = p_report_id;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_report_id ON scheduled_report_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_type ON saved_filters(filter_type);














