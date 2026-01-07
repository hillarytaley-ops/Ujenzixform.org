/**
 * Default Category Images Configuration - KENYA CONSTRUCTION MATERIALS
 * 
 * This file contains images for Kenyan construction material categories.
 * Suppliers can choose to use these default images or upload their own custom images.
 * 
 * HOW TO ADD REAL KENYAN BRAND IMAGES:
 * 1. Take photos at local hardware stores OR
 * 2. Contact Kenyan suppliers (Bamburi, Mabati, Crown Paints) for permission OR
 * 3. Use free stock photos from:
 *    - Unsplash (unsplash.com) - Free for commercial use
 *    - Pexels (pexels.com) - Free for commercial use
 * 
 * 4. Upload YOUR images to Supabase Storage:
 *    - Bucket: 'default-category-images'
 *    - Recommended size: 800x800px
 *    - Format: JPG or PNG
 * 
 * 5. Replace the URLs below with your Supabase public URLs:
 *    Format: https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/cement.jpg
 * 
 * See: KENYA_SPECIFIC_IMAGES_GUIDE.md for detailed instructions
 */

export interface CategoryImage {
  category: string;
  imageUrl: string;
  description: string;
}

export const DEFAULT_CATEGORY_IMAGES: Record<string, CategoryImage> = {
  'Cement': {
    category: 'Cement',
    imageUrl: '/cement.png',
    description: 'Cement - Bamburi, Savannah, Mombasa Cement (50kg bags)'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: '/steel.png',
    description: 'Steel Bars - Y8, Y10, Y12, Y16 KEBS approved rebar'
  },
  'Tiles': {
    category: 'Tiles',
    imageUrl: '/tiles.png',
    description: 'Floor and wall tiles'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: '/paint.png',
    description: 'Paints - Crown, Basco, Galaxy Paints Kenya'
  },
  'Timber': {
    category: 'Timber',
    imageUrl: '/timber.png',
    description: 'Timber - Cypress, Pine, Hardwood (treated & untreated)'
  },
  'Hardware': {
    category: 'Hardware',
    imageUrl: '/hardware.png',
    description: 'Construction hardware and tools'
  },
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: '/plumbing.png',
    description: 'Plumbing - Kenpipe, PVC pipes & fittings KEBS approved'
  },
  'Electrical': {
    category: 'Electrical',
    imageUrl: '/electrical.png',
    description: 'Electrical - Nyayo, Kinga cables KEBS certified'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: '/aggregates.png',
    description: 'Gravel and construction aggregates'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: '/roofing.png',
    description: 'Roofing - Mabati, Safal, Corrugated Iron Sheets Kenya'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: '/insulation.png',
    description: 'Insulation materials'
  },
  'Tools': {
    category: 'Tools',
    imageUrl: '/tools.jpg',
    description: 'Construction tools and equipment'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: '/stone.png',
    description: 'Building stones and rocks'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: '/sand.png',
    description: 'Construction sand'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: '/plywood.png',
    description: 'Plywood sheets and panels'
  },
  'Doors': {
    category: 'Doors',
    imageUrl: '/doors.png',
    description: 'Doors and door frames'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: '/wire.png',
    description: 'Construction wire and cables'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: '/iron-sheets.png',
    description: 'Iron Sheets - Mabati Box Profile, Gauge 28-32'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: '/blocks.png',
    description: 'Concrete blocks and bricks'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: '/glass.png',
    description: 'Glass sheets and panels'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: '/windows.png',
    description: 'Windows and window frames'
  },
  'Other': {
    category: 'Other',
    imageUrl: 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=800&q=80',
    description: 'Other construction materials'
  }
};

/**
 * Get the default image URL for a given category
 * @param category - The material category
 * @returns The default image URL or undefined if not found
 */
const normalizeCategory = (raw: string): string => {
  const v = (raw || '').trim().toLowerCase();
  const direct = Object.keys(DEFAULT_CATEGORY_IMAGES).find(k => k.toLowerCase() === v);
  if (direct) return direct;
  const synonyms: Record<string, string[]> = {
    'Aggregates': ['ballast', 'gravel', 'stone', 'stones', 'aggregate'],
    'Sand': ['river sand', 'sand'],
    'Blocks': ['cabro', 'paving blocks', 'pavement blocks', 'concrete blocks', 'blocks'],
    'Iron Sheets': ['mabati', 'roofing sheets', 'iron sheets', 'roofing'],
    'Steel': ['rebar', 'steel bars', 'reinforcement'],
    'Plumbing': ['pipes', 'pvc pipes', 'plumbing'],
    'Electrical': ['cables', 'switches', 'sockets', 'electrical'],
    'Timber': ['wood', 'lumber', 'timber'],
    'Tiles': ['ceramic tiles', 'floor tiles', 'wall tiles', 'tiles'],
    'Doors': ['door', 'flush door', 'steel door', 'wooden door', 'doors'],
    'Windows': ['window', 'aluminium window', 'upvc window', 'windows'],
    'Wire': ['wire mesh', 'chain link', 'mesh', 'wire'],
    'Tools': ['tools', 'hardware']
  };
  for (const target of Object.keys(synonyms)) {
    if (synonyms[target].some(s => v.includes(s))) return target;
  }
  return 'Other';
};

export const getDefaultCategoryImage = (category: string): string | undefined => {
  const key = normalizeCategory(category);
  return DEFAULT_CATEGORY_IMAGES[key]?.imageUrl;
};

/**
 * Get all category options with their default images
 * @returns Array of category options
 */
export const getCategoryOptions = (): CategoryImage[] => {
  return Object.values(DEFAULT_CATEGORY_IMAGES);
};

/**
 * Check if a category has a default image
 * @param category - The material category
 * @returns True if default image exists
 */
export const hasDefaultImage = (category: string): boolean => {
  const key = normalizeCategory(category);
  return !!DEFAULT_CATEGORY_IMAGES[key];
};

