-- =====================================================================
-- FIX ADMIN_STAFF TABLE
-- =====================================================================
-- Create or fix the admin_staff table structure
-- =====================================================================

-- Create admin_staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    name TEXT NOT NULL DEFAULT 'Staff Member',
    role TEXT DEFAULT 'support',
    is_online BOOLEAN DEFAULT false,
    can_handle_chat BOOLEAN DEFAULT true,
    max_concurrent_chats INTEGER DEFAULT 5,
    current_chat_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table exists
DO $$ 
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.admin_staff ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- Add email if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'email') THEN
        ALTER TABLE public.admin_staff ADD COLUMN email TEXT;
    END IF;

    -- Add name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'name') THEN
        ALTER TABLE public.admin_staff ADD COLUMN name TEXT DEFAULT 'Staff Member';
    END IF;

    -- Add role if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'role') THEN
        ALTER TABLE public.admin_staff ADD COLUMN role TEXT DEFAULT 'support';
    END IF;

    -- Add is_online if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'is_online') THEN
        ALTER TABLE public.admin_staff ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;

    -- Add can_handle_chat if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'can_handle_chat') THEN
        ALTER TABLE public.admin_staff ADD COLUMN can_handle_chat BOOLEAN DEFAULT true;
    END IF;

    -- Add max_concurrent_chats if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'max_concurrent_chats') THEN
        ALTER TABLE public.admin_staff ADD COLUMN max_concurrent_chats INTEGER DEFAULT 5;
    END IF;

    -- Add current_chat_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'current_chat_count') THEN
        ALTER TABLE public.admin_staff ADD COLUMN current_chat_count INTEGER DEFAULT 0;
    END IF;

    -- Add avatar_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'avatar_url') THEN
        ALTER TABLE public.admin_staff ADD COLUMN avatar_url TEXT;
    END IF;

    -- Add last_seen_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'last_seen_at') THEN
        ALTER TABLE public.admin_staff ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.admin_staff ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'admin_staff' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.admin_staff ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view online staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Staff can update own record" ON public.admin_staff;
DROP POLICY IF EXISTS "Public can view online staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Admins can view all staff" ON public.admin_staff;

-- Allow anyone to view online staff (for chat availability)
CREATE POLICY "Public can view online staff"
ON public.admin_staff FOR SELECT
USING (is_online = true);

-- Allow admins to view all staff
CREATE POLICY "Admins can view all staff"
ON public.admin_staff FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Allow admins to manage staff
CREATE POLICY "Admins can manage staff"
ON public.admin_staff FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Allow staff to update their own record
CREATE POLICY "Staff can update own record"
ON public.admin_staff FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Insert default admin staff record if none exists
INSERT INTO public.admin_staff (email, name, role, is_online, can_handle_chat)
SELECT 'hillarytaley@gmail.com', 'Hillary Taley', 'admin', true, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_staff WHERE email = 'hillarytaley@gmail.com'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_staff_is_online ON public.admin_staff(is_online);
CREATE INDEX IF NOT EXISTS idx_admin_staff_email ON public.admin_staff(email);
CREATE INDEX IF NOT EXISTS idx_admin_staff_user_id ON public.admin_staff(user_id);

SELECT 'Admin staff table fixed!' as result;

