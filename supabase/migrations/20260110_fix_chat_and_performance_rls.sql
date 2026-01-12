-- =============================================
-- Fix Chat and Performance Metrics RLS Policies
-- This restores proper access after Phase 5 migration
-- =============================================

-- =============================================
-- FIX CONVERSATIONS TABLE
-- =============================================

-- Drop any admin-only policies that might have been created by Phase 5
DROP POLICY IF EXISTS "admin_only_select_conversations" ON conversations;
DROP POLICY IF EXISTS "admin_only_insert_conversations" ON conversations;
DROP POLICY IF EXISTS "admin_only_update_conversations" ON conversations;
DROP POLICY IF EXISTS "admin_only_delete_conversations" ON conversations;

-- Restore proper chat policies
DROP POLICY IF EXISTS "Anyone can create conversations" ON conversations;
DROP POLICY IF EXISTS "View own or admin view all conversations" ON conversations;
DROP POLICY IF EXISTS "Staff can update conversations" ON conversations;
DROP POLICY IF EXISTS "Staff can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can view their own conversations" ON conversations;

-- Allow anyone (including guests) to create conversations
CREATE POLICY "Anyone can create conversations" ON conversations
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Allow viewing: own conversations OR guest conversations OR admin can view all
CREATE POLICY "View own or admin view all conversations" ON conversations
  FOR SELECT 
  TO anon, authenticated
  USING (
    -- User owns the conversation
    client_id = auth.uid()
    -- OR it's a guest conversation (client_id IS NULL) - visible to all
    OR client_id IS NULL
    -- OR user is admin (check user_roles table)
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
    -- OR user is admin (check profiles table - legacy support)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- Allow staff/admins to update conversations
CREATE POLICY "Staff can update conversations" ON conversations
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- =============================================
-- FIX CHAT_MESSAGES TABLE
-- =============================================

-- Drop any admin-only policies
DROP POLICY IF EXISTS "admin_only_select_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "admin_only_insert_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "admin_only_update_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "admin_only_delete_chat_messages" ON chat_messages;

-- Restore proper chat message policies
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "View messages in conversations" ON chat_messages;
DROP POLICY IF EXISTS "Admin can update chat messages" ON chat_messages;

-- Allow anyone (including guests) to insert messages
CREATE POLICY "Anyone can insert chat messages" ON chat_messages
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Allow viewing messages in accessible conversations
CREATE POLICY "View messages in conversations" ON chat_messages
  FOR SELECT 
  TO anon, authenticated
  USING (
    -- Check if user has access to the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (
        -- User owns the conversation
        c.client_id = auth.uid()
        -- OR it's a guest conversation (visible to all)
        OR c.client_id IS NULL
        -- OR user is admin
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'::app_role
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() 
          AND user_type = 'admin'
        )
      )
    )
  );

-- Allow admins to update messages (mark as read)
CREATE POLICY "Admin can update chat messages" ON chat_messages
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- =============================================
-- FIX PERFORMANCE_METRICS TABLE
-- =============================================

-- Check if performance_metrics table exists and has RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'performance_metrics'
  ) THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY';
    
    -- Drop any admin-only policies
    EXECUTE 'DROP POLICY IF EXISTS "admin_only_select_performance_metrics" ON performance_metrics';
    EXECUTE 'DROP POLICY IF EXISTS "admin_only_insert_performance_metrics" ON performance_metrics';
    EXECUTE 'DROP POLICY IF EXISTS "admin_only_update_performance_metrics" ON performance_metrics';
    EXECUTE 'DROP POLICY IF EXISTS "admin_only_delete_performance_metrics" ON performance_metrics';
    
    -- Create proper policies for performance_metrics
    -- Allow authenticated users to read their own metrics, system metrics (NULL user_id), or admins to read all
    EXECUTE '
      CREATE POLICY "Users can view own performance metrics"
      ON performance_metrics FOR SELECT
      TO anon, authenticated
      USING (
        -- Users can view their own metrics
        user_id = auth.uid()
        -- OR system metrics (NULL user_id) are visible to all authenticated users
        OR (auth.uid() IS NOT NULL AND user_id IS NULL)
        -- OR admins can view all
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = ''admin''::app_role
        )
      );
    ';
    
    -- Allow authenticated users to insert their own metrics OR anonymous users to insert system metrics
    -- user_id can be NULL for system-level performance tracking
    EXECUTE '
      CREATE POLICY "Users can insert own performance metrics"
      ON performance_metrics FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        -- Authenticated users can insert with their own user_id
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        -- OR authenticated users can insert with NULL user_id (system metrics)
        OR (auth.uid() IS NOT NULL AND user_id IS NULL)
        -- OR anonymous users can insert with NULL user_id (client-side tracking)
        OR (auth.uid() IS NULL AND user_id IS NULL)
        -- OR admins can insert for any user
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = ''admin''::app_role
        )
      );
    ';
    
    -- Allow users to update their own metrics or admins to update all
    EXECUTE '
      CREATE POLICY "Users can update own performance metrics"
      ON performance_metrics FOR UPDATE
      TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = ''admin''::app_role
        )
      )
      WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = ''admin''::app_role
        )
      );
    ';
    
    RAISE NOTICE 'Fixed performance_metrics RLS policies';
  ELSE
    RAISE NOTICE 'performance_metrics table does not exist, skipping';
  END IF;
END $$;

