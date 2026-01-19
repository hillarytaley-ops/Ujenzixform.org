-- =====================================================================
-- FINAL FIX FOR RLS POLICIES - Targets exact policy names from linter
-- Run this in Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- 1. FIX handle_new_user FUNCTION - Must drop and recreate with search_path
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
-- 2. FIX chat_messages - Drop exact policy name from linter
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

-- Only create new policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'chat_messages_insert_authenticated'
  ) THEN
    CREATE POLICY "chat_messages_insert_authenticated"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid()::text OR sender_type = 'client');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'chat_messages_insert_anon'
  ) THEN
    CREATE POLICY "chat_messages_insert_anon"
    ON public.chat_messages FOR INSERT
    TO anon
    WITH CHECK (sender_type = 'client');
  END IF;
END $$;

-- =====================================================================
-- 3. FIX delivery_requests - Drop exact policy name from linter
-- =====================================================================
DROP POLICY IF EXISTS "Builders can create delivery requests" ON public.delivery_requests;

-- Only create new policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_requests' 
    AND policyname = 'delivery_requests_insert_builders'
  ) THEN
    CREATE POLICY "delivery_requests_insert_builders"
    ON public.delivery_requests FOR INSERT
    TO authenticated
    WITH CHECK (builder_id = auth.uid());
  END IF;
END $$;

-- =====================================================================
-- 4. FIX feedback - Drop exact policy names from linter
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedback;

-- Only create new policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feedback' 
    AND policyname = 'feedback_insert_anon'
  ) THEN
    CREATE POLICY "feedback_insert_anon"
    ON public.feedback FOR INSERT
    TO anon
    WITH CHECK (comment IS NOT NULL AND length(trim(comment)) > 0);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feedback' 
    AND policyname = 'feedback_insert_authenticated'
  ) THEN
    CREATE POLICY "feedback_insert_authenticated"
    ON public.feedback FOR INSERT
    TO authenticated
    WITH CHECK (comment IS NOT NULL AND length(trim(comment)) > 0);
  END IF;
END $$;

-- =====================================================================
-- VERIFY: Check that old policies are gone
-- =====================================================================
-- SELECT tablename, policyname, cmd, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('chat_messages', 'delivery_requests', 'feedback')
-- AND cmd = 'INSERT';

