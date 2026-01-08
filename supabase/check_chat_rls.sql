-- Check RLS policies on chat_messages table
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

-- Check if RLS is enabled on chat_messages
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'chat_messages';

-- Check conversations table policies too
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
WHERE tablename = 'conversations';
