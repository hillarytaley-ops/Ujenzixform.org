-- Clear demo placeholder KE1UCT0000014 in any casing (extends 20260502180000).
UPDATE public.materials
SET etims_item_code = NULL, updated_at = now()
WHERE upper(btrim(etims_item_code)) = 'KE1UCT0000014';

UPDATE public.supplier_product_prices
SET etims_item_code = NULL, updated_at = now()
WHERE upper(btrim(etims_item_code)) = 'KE1UCT0000014';

UPDATE public.admin_material_images
SET etims_item_code = NULL, updated_at = now()
WHERE upper(btrim(etims_item_code)) = 'KE1UCT0000014';
