-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION check_documents_complete() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.documents_complete = (
    NEW.cv_document_path IS NOT NULL AND
    NEW.driving_license_document_path IS NOT NULL AND
    NEW.national_id_document_path IS NOT NULL AND
    NEW.good_conduct_document_path IS NOT NULL
  );
  RETURN NEW;
END;
$$;