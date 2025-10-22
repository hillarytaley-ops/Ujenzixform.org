-- Drop all existing problematic policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure suppliers table is accessible
DROP POLICY IF EXISTS "Enable read access for all users" ON public.suppliers;
CREATE POLICY "Enable read access for all users" 
  ON public.suppliers 
  FOR SELECT 
  USING (true);

-- Create some test data
INSERT INTO public.profiles (id, user_id, role, user_type, is_professional, full_name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'builder', 'individual', false, 'Demo Builder', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'supplier', 'company', true, 'Demo Supplier', now(), now())
ON CONFLICT (id) DO NOTHING;