-- Check current RLS policies on chat_messages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_messages';

-- Check if RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'chat_messages';

-- If no results or RLS is blocking, run these commands:

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;

-- Create permissive policies for chat
CREATE POLICY "Enable read access for all" ON public.chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated" ON public.chat_messages
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO anon;

