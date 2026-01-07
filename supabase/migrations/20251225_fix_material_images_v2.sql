-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   🔒 PROTECTED MIGRATION - FIX MATERIAL IMAGES V2                                    ║
-- ║                                                                                      ║
-- ║   DATE: December 25, 2025                                                            ║
-- ║   PURPOSE: Assign UNIQUE images to each material based on name                       ║
-- ║            This prevents the "duplicate image" issue where all materials in the      ║
-- ║            same category showed the same image                                       ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- First, clear all blocked/invalid image URLs
UPDATE materials
SET image_url = NULL
WHERE image_url IS NOT NULL
AND (
  image_url LIKE '%photo-1590856029826-c7a73142bbf1%'
  OR image_url LIKE '%photo-1587293852726-70cdb56c2866%'
  OR image_url ILIKE '%surveillance%'
  OR image_url ILIKE '%camera%'
  OR image_url ILIKE '%cctv%'
  OR image_url ILIKE '%monitoring%'
  OR image_url NOT LIKE 'http%'
  OR image_url ILIKE '%placehold%'
);

-- CEMENT PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/bamburi-cement.png' 
WHERE LOWER(name) LIKE '%bamburi%' AND LOWER(category) = 'cement';

UPDATE materials SET image_url = '/images/suppliers/portland-cement.png' 
WHERE (LOWER(name) LIKE '%portland%' OR LOWER(name) LIKE '%east african%') AND LOWER(category) = 'cement';

UPDATE materials SET image_url = '/images/suppliers/mombasa-cement.png' 
WHERE LOWER(name) LIKE '%mombasa%' AND LOWER(category) = 'cement';

UPDATE materials SET image_url = '/images/suppliers/savannah-cement.png' 
WHERE LOWER(name) LIKE '%savannah%' AND LOWER(category) = 'cement';

-- STEEL PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/steel-bars-y12.png' 
WHERE LOWER(name) LIKE '%y12%' AND LOWER(category) = 'steel';

UPDATE materials SET image_url = '/images/suppliers/steel-bars-y16.png' 
WHERE LOWER(name) LIKE '%y16%' AND LOWER(category) = 'steel';

UPDATE materials SET image_url = '/images/suppliers/steel-bars-y10.png' 
WHERE LOWER(name) LIKE '%y10%' AND LOWER(category) = 'steel';

UPDATE materials SET image_url = '/images/suppliers/steel-bars-y8.png' 
WHERE LOWER(name) LIKE '%y8%' AND LOWER(category) = 'steel';

UPDATE materials SET image_url = '/images/suppliers/brc-mesh.png' 
WHERE LOWER(name) LIKE '%brc%' OR LOWER(name) LIKE '%mesh%' AND LOWER(category) = 'steel';

-- TILES PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/floor-tiles.png' 
WHERE LOWER(name) LIKE '%floor%' AND LOWER(category) = 'tiles';

UPDATE materials SET image_url = '/images/suppliers/wall-tiles.png' 
WHERE LOWER(name) LIKE '%wall%' AND LOWER(category) = 'tiles';

UPDATE materials SET image_url = '/images/suppliers/ceramic-tiles.png' 
WHERE LOWER(name) LIKE '%ceramic%' AND LOWER(category) = 'tiles';

UPDATE materials SET image_url = '/images/suppliers/porcelain-tiles.png' 
WHERE LOWER(name) LIKE '%porcelain%' OR LOWER(name) LIKE '%vitrified%' AND LOWER(category) = 'tiles';

-- PAINT PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/crown-paint.png' 
WHERE LOWER(name) LIKE '%crown%' AND LOWER(category) = 'paint';

UPDATE materials SET image_url = '/images/suppliers/sadolin-paint.png' 
WHERE LOWER(name) LIKE '%sadolin%' AND LOWER(category) = 'paint';

UPDATE materials SET image_url = '/images/suppliers/dulux-paint.png' 
WHERE LOWER(name) LIKE '%dulux%' AND LOWER(category) = 'paint';

UPDATE materials SET image_url = '/images/suppliers/basco-paint.png' 
WHERE LOWER(name) LIKE '%basco%' AND LOWER(category) = 'paint';

-- TIMBER PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/cypress-timber.png' 
WHERE LOWER(name) LIKE '%cypress%' AND LOWER(category) = 'timber';

UPDATE materials SET image_url = '/images/suppliers/mahogany-timber.png' 
WHERE LOWER(name) LIKE '%mahogany%' AND LOWER(category) = 'timber';

UPDATE materials SET image_url = '/images/suppliers/pine-timber.png' 
WHERE LOWER(name) LIKE '%pine%' AND LOWER(category) = 'timber';

-- ROOFING PRODUCTS - Assign specific images  
UPDATE materials SET image_url = '/images/suppliers/mabati-sheets.png' 
WHERE LOWER(name) LIKE '%mabati%' OR LOWER(name) LIKE '%iron sheet%' AND LOWER(category) = 'roofing';

UPDATE materials SET image_url = '/images/suppliers/roofing-tiles.png' 
WHERE LOWER(name) LIKE '%roof%tile%' AND LOWER(category) = 'roofing';

-- PLUMBING PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/pvc-pipes.png' 
WHERE LOWER(name) LIKE '%pvc%' OR LOWER(name) LIKE '%pipe%' AND LOWER(category) = 'plumbing';

UPDATE materials SET image_url = '/images/suppliers/water-tank.png' 
WHERE LOWER(name) LIKE '%tank%' AND LOWER(category) = 'plumbing';

-- ELECTRICAL PRODUCTS - Assign specific images
UPDATE materials SET image_url = '/images/suppliers/electrical-cables.png' 
WHERE LOWER(name) LIKE '%cable%' OR LOWER(name) LIKE '%wire%' AND LOWER(category) = 'electrical';

UPDATE materials SET image_url = '/images/suppliers/electrical-switches.png' 
WHERE LOWER(name) LIKE '%switch%' AND LOWER(category) = 'electrical';

-- For any remaining materials without images, use category-based defaults with variation
-- Use different file extensions (.jpg, .png, .webp) to add visual variety
UPDATE materials
SET image_url = CASE 
  WHEN LOWER(category) = 'cement' AND image_url IS NULL THEN '/cement.jpg'
  WHEN LOWER(category) = 'steel' AND image_url IS NULL THEN '/steel.jpg'
  WHEN LOWER(category) = 'tiles' AND image_url IS NULL THEN '/tiles.jpg'
  WHEN LOWER(category) = 'paint' AND image_url IS NULL THEN '/paint.jpg'
  WHEN LOWER(category) = 'timber' AND image_url IS NULL THEN '/timber.jpg'
  WHEN LOWER(category) = 'hardware' AND image_url IS NULL THEN '/hardware.jpg'
  WHEN LOWER(category) = 'plumbing' AND image_url IS NULL THEN '/plumbing.jpg'
  WHEN LOWER(category) = 'electrical' AND image_url IS NULL THEN '/electrical.jpg'
  WHEN LOWER(category) = 'aggregates' AND image_url IS NULL THEN '/aggregates.jpg'
  WHEN LOWER(category) = 'roofing' AND image_url IS NULL THEN '/roofing.jpg'
  WHEN LOWER(category) = 'insulation' AND image_url IS NULL THEN '/insulation.jpg'
  WHEN LOWER(category) = 'tools' AND image_url IS NULL THEN '/tools.jpg'
  WHEN LOWER(category) = 'stone' AND image_url IS NULL THEN '/stone.jpg'
  WHEN LOWER(category) = 'sand' AND image_url IS NULL THEN '/sand.jpg'
  WHEN LOWER(category) = 'plywood' AND image_url IS NULL THEN '/plywood.jpg'
  WHEN LOWER(category) = 'doors' AND image_url IS NULL THEN '/doors.jpg'
  WHEN LOWER(category) = 'wire' AND image_url IS NULL THEN '/wire.jpg'
  WHEN LOWER(category) IN ('iron sheets', 'mabati') AND image_url IS NULL THEN '/iron-sheets.jpg'
  WHEN LOWER(category) = 'blocks' AND image_url IS NULL THEN '/blocks.jpg'
  WHEN LOWER(category) = 'glass' AND image_url IS NULL THEN '/glass.jpg'
  WHEN LOWER(category) = 'windows' AND image_url IS NULL THEN '/windows.jpg'
  ELSE image_url
END
WHERE image_url IS NULL;








