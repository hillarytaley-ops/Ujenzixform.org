-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Create policies for invoice storage
CREATE POLICY "Professional builders can upload invoices"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'builder' 
    AND (user_type = 'company' OR is_professional = true)
  )
);

CREATE POLICY "Professional builders can view their own invoices"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'builder' 
    AND (user_type = 'company' OR is_professional = true)
  )
);

CREATE POLICY "Professional builders can update their own invoices"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'builder' 
    AND (user_type = 'company' OR is_professional = true)
  )
);

CREATE POLICY "Professional builders can delete their own invoices"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'builder' 
    AND (user_type = 'company' OR is_professional = true)
  )
);