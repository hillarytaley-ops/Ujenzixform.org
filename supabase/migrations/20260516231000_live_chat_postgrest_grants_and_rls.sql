-- Live chat: PostgREST returns 401 + Postgres 42501 "permission denied for table conversations"
-- when anon/authenticated lack table GRANTs or no INSERT RLS policy applies after policy drift.
-- Idempotent: re-assert grants, collapse INSERT policies to one permissive policy per table,
-- and add a permissive UPDATE policy so guest PATCH (last_message, close) is not blocked by RLS.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO anon, authenticated;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY live_chat_conversations_insert_public
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY live_chat_chat_messages_insert_public
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS live_chat_conversations_update_public ON public.conversations;

CREATE POLICY live_chat_conversations_update_public
  ON public.conversations FOR UPDATE
  USING (true)
  WITH CHECK (true);
