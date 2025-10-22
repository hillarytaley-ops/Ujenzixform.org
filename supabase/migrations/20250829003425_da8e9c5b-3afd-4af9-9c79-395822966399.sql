-- Enable real-time updates for suppliers table
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;

-- Add suppliers table to realtime publication
-- (This will be handled automatically by Supabase, but we include it for completeness)