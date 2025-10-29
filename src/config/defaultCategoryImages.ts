/**
 * Default Category Images Configuration
 * 
 * This file contains placeholder image URLs for each material category.
 * Suppliers can choose to use these default images or upload their own custom images.
 * 
 * HOW TO ADD REAL IMAGES:
 * 1. Download/purchase royalty-free images from sources like:
 *    - Unsplash (unsplash.com) - Free for commercial use
 *    - Pexels (pexels.com) - Free for commercial use
 *    - Pixabay (pixabay.com) - Free for commercial use
 * 
 * 2. Upload images to Supabase Storage:
 *    - Bucket: 'default-category-images'
 *    - Recommended size: 800x800px
 *    - Format: JPG or PNG
 * 
 * 3. Replace the placeholder URLs below with your Supabase public URLs
 */

export interface CategoryImage {
  category: string;
  imageUrl: string;
  description: string;
}

export const DEFAULT_CATEGORY_IMAGES: Record<string, CategoryImage> = {
  'Cement': {
    category: 'Cement',
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
    description: 'Cement bags and powder'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: 'https://images.unsplash.com/photo-1565620843922-434f8c65e939?w=800&q=80',
    description: 'Steel bars and reinforcement'
  },
  'Tiles': {
    category: 'Tiles',
    imageUrl: 'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=800&q=80',
    description: 'Floor and wall tiles'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80',
    description: 'Paint cans and buckets'
  },
  'Timber': {
    category: 'Timber',
    imageUrl: 'https://images.unsplash.com/photo-1614963366795-3b0e4c7f9ba7?w=800&q=80',
    description: 'Lumber and wood planks'
  },
  'Hardware': {
    category: 'Hardware',
    imageUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=80',
    description: 'Construction hardware and tools'
  },
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
    description: 'Pipes and plumbing fittings'
  },
  'Electrical': {
    category: 'Electrical',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
    description: 'Electrical wires and cables'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
    description: 'Gravel and construction aggregates'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800&q=80',
    description: 'Roofing sheets and materials'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
    description: 'Insulation materials'
  },
  'Tools': {
    category: 'Tools',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80',
    description: 'Construction tools and equipment'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80',
    description: 'Building stones and rocks'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=800&q=80',
    description: 'Construction sand'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: 'https://images.unsplash.com/photo-1601861372099-f2817d1e5239?w=800&q=80',
    description: 'Plywood sheets and panels'
  },
  'Doors': {
    category: 'Doors',
    imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80',
    description: 'Doors and door frames'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
    description: 'Construction wire and cables'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800&q=80',
    description: 'Corrugated iron and metal roofing sheets'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: 'https://images.unsplash.com/photo-1598701953828-30ae352f4034?w=800&q=80',
    description: 'Concrete blocks and bricks'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    description: 'Glass sheets and panels'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: 'https://images.unsplash.com/photo-1519710889408-a241f66e9df9?w=800&q=80',
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

