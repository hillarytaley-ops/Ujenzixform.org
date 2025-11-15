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
    imageUrl: 'https://images.unsplash.com/photo-1581091012184-7c54a6b648bf?q=80&w=800&auto=format&fit=crop',
    description: 'Cement - Bamburi, Savannah, Mombasa Cement (50kg bags)'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: 'https://images.unsplash.com/photo-1581093535283-18d2d79a2f30?q=80&w=800&auto=format&fit=crop',
    description: 'Steel Bars - Y8, Y10, Y12, Y16 KEBS approved rebar'
  },
  'Tiles': {
    category: 'Tiles',
    imageUrl: 'https://images.unsplash.com/photo-1582582429416-dbf2e2eec0ed?q=80&w=800&auto=format&fit=crop',
    description: 'Floor and wall tiles'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop',
    description: 'Paints - Crown, Basco, Galaxy Paints Kenya'
  },
  'Timber': {
    category: 'Timber',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop',
    description: 'Timber - Cypress, Pine, Hardwood (treated & untreated)'
  },
  'Hardware': {
    category: 'Hardware',
    imageUrl: 'https://images.unsplash.com/photo-1556228724-4c1dc4e38d3b?q=80&w=800&auto=format&fit=crop',
    description: 'Construction hardware and tools'
  },
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1563436542-5b8b6ce2481e?q=80&w=800&auto=format&fit=crop',
    description: 'Plumbing - Kenpipe, PVC pipes & fittings KEBS approved'
  },
  'Electrical': {
    category: 'Electrical',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-0e8283a1a946?q=80&w=800&auto=format&fit=crop',
    description: 'Electrical - Nyayo, Kinga cables KEBS certified'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: 'https://images.unsplash.com/photo-1529676468695-6386a0376dec?q=80&w=800&auto=format&fit=crop',
    description: 'Gravel and construction aggregates'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=800&auto=format&fit=crop',
    description: 'Roofing - Mabati, Safal, Corrugated Iron Sheets Kenya'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: 'https://images.unsplash.com/photo-1581304931159-0cedf46af0c3?q=80&w=800&auto=format&fit=crop',
    description: 'Insulation materials'
  },
  'Tools': {
    category: 'Tools',
    imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop',
    description: 'Construction tools and equipment'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: 'https://images.unsplash.com/photo-1506377713090-2f94a65f0568?q=80&w=800&auto=format&fit=crop',
    description: 'Building stones and rocks'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: 'https://images.unsplash.com/photo-1520284766981-3d6f11a5bafa?q=80&w=800&auto=format&fit=crop',
    description: 'Construction sand'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: 'https://images.unsplash.com/photo-1550136513-548af4449bc7?q=80&w=800&auto=format&fit=crop',
    description: 'Plywood sheets and panels'
  },
  'Doors': {
    category: 'Doors',
    imageUrl: 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?q=80&w=800&auto=format&fit=crop',
    description: 'Doors and door frames'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: 'https://images.unsplash.com/photo-1562259942-2a0ab4b3b49f?q=80&w=800&auto=format&fit=crop',
    description: 'Construction wire and cables'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: 'https://images.unsplash.com/photo-1599419020646-5dfba7f03cfe?q=80&w=800&auto=format&fit=crop',
    description: 'Iron Sheets - Mabati Box Profile, Gauge 28-32'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop',
    description: 'Concrete blocks and bricks'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: 'https://images.unsplash.com/photo-1552940026-6c88f7a0b48b?q=80&w=800&auto=format&fit=crop',
    description: 'Glass sheets and panels'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: 'https://images.unsplash.com/photo-1549399546-da189e3fd1f5?q=80&w=800&auto=format&fit=crop',
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

