-- Supplier material upload requests: units, extra photos, structured variants (size/color/price/unit)

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE product_requests
  ADD COLUMN IF NOT EXISTS unit TEXT;

ALTER TABLE product_requests
  ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE product_requests
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN product_requests.unit IS 'Default unit of measure (e.g. piece, bag).';
COMMENT ON COLUMN product_requests.additional_images IS 'Array of image URLs for extra angles.';
COMMENT ON COLUMN product_requests.variants IS 'Array of {name, color?, price, unit?} for SKU/size/color options.';

-- Authenticated suppliers upload request photos under their uid (public URLs for admin review)
DROP POLICY IF EXISTS "Suppliers upload material request images" ON storage.objects;
CREATE POLICY "Suppliers upload material request images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'supplier-material-requests'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Suppliers update own material request images" ON storage.objects;
CREATE POLICY "Suppliers update own material request images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'supplier-material-requests'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Suppliers delete own material request images" ON storage.objects;
CREATE POLICY "Suppliers delete own material request images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'supplier-material-requests'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view product-images" ON storage.objects;
CREATE POLICY "Anyone can view product-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
