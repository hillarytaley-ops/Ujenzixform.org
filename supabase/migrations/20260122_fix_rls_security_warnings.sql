-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   🔒 FIX RLS SECURITY WARNINGS                                                       ║
-- ║                                                                                      ║
-- ║   CREATED: January 22, 2026                                                          ║
-- ║   PURPOSE: Fix overly permissive RLS policies flagged by Supabase linter             ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FIX: get_users_with_roles function - set immutable search_path
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    u.id as user_id,
    u.email,
    ur.role::text,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FIX: chat_messages INSERT policy
-- Allow authenticated users to insert their own messages
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

CREATE POLICY "chat_messages_insert"
  ON chat_messages FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Users can insert messages where they are the sender
    -- OR for anonymous chat (client type messages)
    sender_type = 'client'
    OR sender_id = auth.uid()::text
    OR sender_id IS NULL
    -- Admins/staff can insert any messages
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. FIX: conversations INSERT policy
-- Allow users to create conversations they participate in
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create conversations where they are a participant
    user_id = auth.uid()
    OR participant_id = auth.uid()
    -- Admins can create any conversation
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. FIX: delivery_provider_registrations INSERT policy
-- Allow users to register themselves as delivery providers
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "allow_insert" ON delivery_provider_registrations;

CREATE POLICY "delivery_provider_registrations_insert"
  ON delivery_provider_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only insert their own registration
    user_id = auth.uid()
    OR applicant_user_id = auth.uid()
    -- Admins can insert any registration
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FIX: delivery_provider_registrations UPDATE policy
-- Allow users to update only their own registration
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "allow_update" ON delivery_provider_registrations;

CREATE POLICY "delivery_provider_registrations_update"
  ON delivery_provider_registrations FOR UPDATE
  TO authenticated
  USING (
    -- Users can only update their own registration
    user_id = auth.uid()
    OR applicant_user_id = auth.uid()
    -- Admins can update any registration
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  );

