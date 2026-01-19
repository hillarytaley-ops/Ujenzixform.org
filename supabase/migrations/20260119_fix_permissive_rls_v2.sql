-- =====================================================================
-- FIX OVERLY PERMISSIVE RLS POLICIES - VERSION 2
-- This script explicitly drops ALL old policies before creating new ones
-- Run this in Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- 1. FIX handle_new_user FUNCTION - Set search_path
-- =====================================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 2. FIX chat_messages RLS
-- =====================================================================
-- Drop ALL existing INSERT policies on chat_messages
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anonymous can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.chat_messages;

-- Create new restricted policies
CREATE POLICY "chat_messages_insert_authenticated"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  OR sender_type = 'client'
);

CREATE POLICY "chat_messages_insert_anon"
ON public.chat_messages FOR INSERT
TO anon
WITH CHECK (
  sender_type = 'client'
);

-- =====================================================================
-- 3. FIX conversations RLS
-- =====================================================================
-- Drop ALL existing INSERT policies on conversations
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anonymous can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.conversations;

-- Create new policies with non-true checks where possible
-- conversations table has: client_id, client_name, client_email, etc.
CREATE POLICY "conversations_insert_authenticated"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  -- Authenticated user must be creating a conversation for themselves or as guest
  client_id IS NULL OR client_id = auth.uid()
);

CREATE POLICY "conversations_insert_anon"
ON public.conversations FOR INSERT
TO anon
WITH CHECK (
  -- Anonymous users can only create conversations without a client_id (guest chat)
  client_id IS NULL
);

-- =====================================================================
-- 4. FIX delivery_requests RLS
-- =====================================================================
-- Drop ALL existing INSERT policies on delivery_requests
DROP POLICY IF EXISTS "Builders can create delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Builders can create own delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_insert" ON public.delivery_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.delivery_requests;

-- Create new restricted policy
CREATE POLICY "delivery_requests_insert_builders"
ON public.delivery_requests FOR INSERT
TO authenticated
WITH CHECK (
  builder_id = auth.uid()
);

-- =====================================================================
-- 5. FIX feedback RLS
-- =====================================================================
-- Drop ALL existing INSERT policies on feedback
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback with content" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.feedback;
DROP POLICY IF EXISTS "public_feedback_insert" ON public.feedback;
DROP POLICY IF EXISTS "anon_feedback_insert" ON public.feedback;

-- Create new policies with validation
CREATE POLICY "feedback_insert_anon"
ON public.feedback FOR INSERT
TO anon
WITH CHECK (
  comment IS NOT NULL 
  AND length(trim(comment)) > 0
);

CREATE POLICY "feedback_insert_authenticated"
ON public.feedback FOR INSERT
TO authenticated
WITH CHECK (
  comment IS NOT NULL 
  AND length(trim(comment)) > 0
);

-- =====================================================================
-- VERIFICATION: List all policies to confirm changes
-- =====================================================================
-- Run this separately to verify:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('chat_messages', 'conversations', 'delivery_requests', 'feedback', 'deliveries')
-- ORDER BY tablename, policyname;

