-- Create storage bucket for provider documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('provider-documents', 'provider-documents', false);

-- Create storage policies for provider documents
CREATE POLICY "Users can upload their own provider documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'provider-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can view their own provider documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'provider-documents' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Admins can manage all provider documents" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'provider-documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add additional columns to delivery_providers table for document tracking
ALTER TABLE delivery_providers 
ADD COLUMN IF NOT EXISTS cv_document_path text,
ADD COLUMN IF NOT EXISTS national_id_document_path text,
ADD COLUMN IF NOT EXISTS good_conduct_document_path text,
ADD COLUMN IF NOT EXISTS cv_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS national_id_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS good_conduct_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS documents_complete boolean DEFAULT false;

-- Create function to check if all required documents are uploaded
CREATE OR REPLACE FUNCTION check_documents_complete() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.documents_complete = (
    NEW.cv_document_path IS NOT NULL AND
    NEW.driving_license_document_path IS NOT NULL AND
    NEW.national_id_document_path IS NOT NULL AND
    NEW.good_conduct_document_path IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update documents_complete status
DROP TRIGGER IF EXISTS trigger_check_documents_complete ON delivery_providers;
CREATE TRIGGER trigger_check_documents_complete
  BEFORE INSERT OR UPDATE ON delivery_providers
  FOR EACH ROW
  EXECUTE FUNCTION check_documents_complete();