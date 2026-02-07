-- ============================================================
-- Fix delivery_requests INSERT RLS Policy
-- Allow builders and private clients to create delivery requests
-- Created: February 7, 2026
-- ============================================================

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "delivery_requests_insert_builders" ON public.delivery_requests;
DROP POLICY IF EXISTS "Builders can create delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Anyone can create delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Authenticated users can create delivery requests" ON public.delivery_requests;

-- Create a permissive INSERT policy for authenticated users
-- The builder_id must match auth.uid() for data isolation
CREATE POLICY "Authenticated users can create delivery requests"
ON public.delivery_requests FOR INSERT
TO authenticated
WITH CHECK (
    builder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Ensure grants are in place
GRANT SELECT, INSERT, UPDATE ON public.delivery_requests TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

SELECT 'delivery_requests INSERT policy fixed!' AS result;
