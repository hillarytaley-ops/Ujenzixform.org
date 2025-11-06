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
    imageUrl: 'https://sl.bing.net/b1vr8GyD7ee',
    description: 'Cement - Bamburi, Savannah, Mombasa Cement (50kg bags)'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: 'https://sl.bing.net/gD7nb7BDEAu',
    description: 'Steel Bars - Y8, Y10, Y12, Y16 KEBS approved rebar'
  },
  'Tiles': {
    category: 'Tiles',
    imageUrl: 'https://sl.bing.net/hVM1CA1undI',
    description: 'Floor and wall tiles'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: 'https://sl.bing.net/ePp3pVreHaS',
    description: 'Paints - Crown, Basco, Galaxy Paints Kenya'
  },
  'Timber': {
    category: 'Timber',
    imageUrl: 'https://sl.bing.net/kRWxigmmNjw',
    description: 'Timber - Cypress, Pine, Hardwood (treated & untreated)'
  },
  'Hardware': {
    category: 'Hardware',
    imageUrl: 'https://sl.bing.net/ejydxQRU3yu',
    description: 'Construction hardware and tools'
  },
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: 'https://sl.bing.net/357RZ1PTMW',
    description: 'Plumbing - Kenpipe, PVC pipes & fittings KEBS approved'
  },
  'Electrical': {
    category: 'Electrical',
    imageUrl: 'https://sl.bing.net/fhouNYIm0GW',
    description: 'Electrical - Nyayo, Kinga cables KEBS certified'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: 'https://sl.bing.net/gvZ4SgonZoy',
    description: 'Gravel and construction aggregates'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: 'https://sl.bing.net/ftcNymsdWrA',
    description: 'Roofing - Mabati, Safal, Corrugated Iron Sheets Kenya'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: 'https://sl.bing.net/jFEDqHHMlBk',
    description: 'Insulation materials'
  },
  'Tools': {
    category: 'Tools',
    imageUrl: 'https://sl.bing.net/crvj8Jm4pR6',
    description: 'Construction tools and equipment'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: 'https://sl.bing.net/jXowQwP4pMa',
    description: 'Building stones and rocks'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: 'https://sl.bing.net/dnmTgP6zVJs',
    description: 'Construction sand'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: 'https://sl.bing.net/dzCQIIqn3fw',
    description: 'Plywood sheets and panels'
  },
  'Doors': {
    category: 'Doors',
    imageUrl: 'https://sl.bing.net/ibq53Ap0msK',
    description: 'Doors and door frames'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: 'https://sl.bing.net/3DMHSQO6ea',
    description: 'Construction wire and cables'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: 'https://sl.bing.net/beK96McnePk',
    description: 'Iron Sheets - Mabati Box Profile, Gauge 28-32'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: 'https://sl.bing.net/kT4pEXTsmFU',
    description: 'Concrete blocks and bricks'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: 'https://sl.bing.net/k4f8agEkbUi',
    description: 'Glass sheets and panels'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: 'https://sl.bing.net/fwHwNfR7FNA',
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

