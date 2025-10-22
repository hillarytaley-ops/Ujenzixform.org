-- Fix infinite recursion in profiles table policies by creating security definer functions
-- This addresses the 500 errors we're seeing in the network requests

-- First, let's create a security definer function to get user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Create function to check if user is supplier
CREATE OR REPLACE FUNCTION public.is_current_user_supplier()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  );
$$;

-- Create function to check if user is builder (FIXED SYNTAX ERROR)
CREATE OR REPLACE FUNCTION public.is_current_user_builder()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder'
  );
$$;