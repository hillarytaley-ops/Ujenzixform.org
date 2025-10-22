-- Make suppliers table completely secure - remove public read access
-- Now users must use the secure function to access supplier data

DROP POLICY IF EXISTS "Public can view basic supplier info" ON public.suppliers;

-- Only allow suppliers to manage their own profiles and admins to see all
CREATE POLICY "Suppliers can manage their own profiles only" 
ON public.suppliers FOR ALL 
USING (
  public.is_current_user_admin() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = suppliers.user_id
  )
);

-- Grant execute permission on secure functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_secure_supplier_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_provider_data() TO authenticated;

-- Grant execute permission to anonymous users as well (they'll get filtered data)
GRANT EXECUTE ON FUNCTION public.get_secure_supplier_data() TO anon;
GRANT EXECUTE ON FUNCTION public.get_secure_provider_data() TO anon;