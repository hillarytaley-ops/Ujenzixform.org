-- Remove legacy tutorial placeholder that is not a real integrator item code.
UPDATE public.materials
SET etims_item_code = NULL, updated_at = now()
WHERE btrim(etims_item_code) = 'KE1UCT0000014';

UPDATE public.supplier_product_prices
SET etims_item_code = NULL, updated_at = now()
WHERE btrim(etims_item_code) = 'KE1UCT0000014';

UPDATE public.admin_material_images
SET etims_item_code = NULL, updated_at = now()
WHERE btrim(etims_item_code) = 'KE1UCT0000014';
