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
    imageUrl: '/cement.jpg',
    description: 'Cement - Bamburi, Savannah, Mombasa Cement (50kg bags)'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: '/steel.jpg',
    description: 'Steel Bars - Y8, Y10, Y12, Y16 KEBS approved rebar'
  },
  'Tiles': {
    category: 'Tiles',
    imageUrl: '/tiles.jpg',
    description: 'Floor and wall tiles'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: '/paint.png',
    description: 'Paints - Crown, Basco, Galaxy Paints Kenya'
  },
  'Timber': {
    category: 'Timber',
    imageUrl: '/timber.jpg',
    description: 'Timber - Cypress, Pine, Hardwood (treated & untreated)'
  },
  'Hardware': {
    category: 'Hardware',
    imageUrl: '/hardware.jpg',
    description: 'Construction hardware and tools'
  },
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: '/plumbing.jpg',
    description: 'Plumbing - Kenpipe, PVC pipes & fittings KEBS approved'
  },
  'Electrical': {
    category: 'Electrical',
    imageUrl: '/electrical.jpg',
    description: 'Electrical - Nyayo, Kinga cables KEBS certified'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: '/stone.jpg',
    description: 'Gravel and construction aggregates'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: '/roofing.jpg',
    description: 'Roofing - Mabati, Safal, Corrugated Iron Sheets Kenya'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: '/insulation.jpg',
    description: 'Insulation materials'
  },
  'Tools': {
    category: 'Tools',
    imageUrl: '/tools.jpg',
    description: 'Construction tools and equipment'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: '/stone.jpg',
    description: 'Building stones and rocks'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: '/sand.jpg',
    description: 'Construction sand'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: '/plywood.jpg',
    description: 'Plywood sheets and panels'
  },
  'Doors': {
    category: 'Doors',
    imageUrl: '/doors.jpg',
    description: 'Doors and door frames'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: '/wire.jpg',
    description: 'Construction wire and cables'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: '/iron-sheets.jpg',
    description: 'Iron Sheets - Mabati Box Profile, Gauge 28-32'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: '/blocks.jpg',
    description: 'Concrete blocks and bricks'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: '/glass.jpg',
    description: 'Glass sheets and panels'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: '/windows.jpg',
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
export const getDefaultCategoryImage = (category: string): string | undefined => {
  return DEFAULT_CATEGORY_IMAGES[category]?.imageUrl;
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
  return !!DEFAULT_CATEGORY_IMAGES[category];
};

