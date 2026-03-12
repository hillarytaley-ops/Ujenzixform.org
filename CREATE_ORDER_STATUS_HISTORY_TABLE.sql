-- ===================================================================
-- CREATE order_status_history TABLE
-- This table is required for delivery acceptance to work
-- ===================================================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON public.order_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "System can insert status history" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_select_policy" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_insert_policy" ON public.order_status_history;

-- Create RLS policies
CREATE POLICY "Users can view order status history"
    ON public.order_status_history FOR SELECT
    USING (TRUE);

CREATE POLICY "System can insert status history"
    ON public.order_status_history FOR INSERT
    WITH CHECK (TRUE);

-- Grant permissions
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT SELECT, INSERT ON public.order_status_history TO anon;

-- Verify table was created
SELECT 
    'order_status_history table created' as status,
    COUNT(*) as existing_records
FROM public.order_status_history;
