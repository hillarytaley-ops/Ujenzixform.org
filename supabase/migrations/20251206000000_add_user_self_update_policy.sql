-- ===================================================================
-- ADD USER SELF-UPDATE POLICIES FOR REGISTRATION TABLES
-- ===================================================================
-- This migration adds policies allowing users to update their own
-- registration records. This is needed for upsert operations.
-- ===================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "builder_reg_user_update_own" ON public.builder_registrations;
DROP POLICY IF EXISTS "supplier_reg_user_update_own" ON public.supplier_registrations;
DROP POLICY IF EXISTS "delivery_reg_user_update_own" ON public.delivery_provider_registrations;

-- Builder registrations - users can update their own registration
CREATE POLICY "builder_reg_user_update_own"
ON public.builder_registrations
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Supplier registrations - users can update their own registration  
CREATE POLICY "supplier_reg_user_update_own"
ON public.supplier_registrations
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Delivery provider registrations - users can update their own registration
CREATE POLICY "delivery_reg_user_update_own"
ON public.delivery_provider_registrations
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Also ensure user_roles allows users to insert/update their own role
-- (This is needed for the sign-in flow to assign roles)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_roles_user_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_select_own" ON public.user_roles;

-- Create policies for user_roles table
CREATE POLICY "user_roles_user_insert_own"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_user_update_own"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_user_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
