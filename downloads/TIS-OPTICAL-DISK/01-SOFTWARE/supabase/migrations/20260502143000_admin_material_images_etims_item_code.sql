-- KRA / integrator item code on admin catalog mirror (same id as materials when mirrored).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_material_images' AND column_name = 'etims_item_code'
  ) THEN
    ALTER TABLE public.admin_material_images ADD COLUMN etims_item_code TEXT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.admin_material_images.etims_item_code IS 'KRA/integrator item code for this catalog row (eTIMS); mirrored to materials when present.';
