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
    imageUrl: 'https://sl.bing.net/d62tA3E0PXE',
    description: 'Cement bags and powder'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: 'https://sl.bing.net/kobtIuYbsiW',
    description: 'Steel bars and reinforcement'
  },
  'Tiles': {
    category: 'Tiles',
    imageUrl: 'https://sl.bing.net/k5PNWfszVHo',
    description: 'Floor and wall tiles'
  },
  'Paint': {
    category: 'Paint',
    imageUrl: 'https://sl.bing.net/gEnK82bfXiK',
    description: 'Paint cans and buckets'
  },
  'Timber': {
    category: 'Timber',
    imageUrl: 'https://sl.bing.net/hQaCuQAPwJw',
    description: 'Lumber and wood planks'
  },
  'Hardware': {
    category: 'Hardware',
    imageUrl: 'https://sl.bing.net/eN1ACSfGMkS',
    description: 'Construction hardware and tools'
  },
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: 'https://sl.bing.net/fVaL3oegSho',
    description: 'Pipes and plumbing fittings'
  },
  'Electrical': {
    category: 'Electrical',
    imageUrl: 'https://sl.bing.net/bmCmpR8ms5Q',
    description: 'Electrical wires and cables'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: 'https://sl.bing.net/jlxtls1ISDk',
    description: 'Gravel and construction aggregates'
  },
  'Roofing': {
    category: 'Roofing',
    imageUrl: 'https://sl.bing.net/eeRYnLyVrDo',
    description: 'Roofing sheets and materials'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: 'https://sl.bing.net/k3GNta7wpA4',
    description: 'Insulation materials'
  },
  'Tools': {
    category: 'Tools',
    imageUrl: 'https://sl.bing.net/dQ7UNR9BfZ6',
    description: 'Construction tools and equipment'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: 'https://sl.bing.net/fZm4AVNM8vA',
    description: 'Building stones and rocks'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: 'https://sl.bing.net/kpEDIO04WKi',
    description: 'Construction sand'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: 'https://sl.bing.net/dZuvpl3tsaa',
    description: 'Plywood sheets and panels'
  },
  'Doors': {
    category: 'Doors',
    imageUrl: 'https://sl.bing.net/LCWbUGNhtc',
    description: 'Doors and door frames'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: 'https://sl.bing.net/bBIGmanV39g',
    description: 'Construction wire and cables'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: 'https://sl.bing.net/f6ET2WN4vuK',
    description: 'Corrugated iron and metal roofing sheets'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: 'https://sl.bing.net/i5Z59m7JCxM',
    description: 'Concrete blocks and bricks'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: 'https://sl.bing.net/hNgomj7rZe0',
    description: 'Glass sheets and panels'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: 'https://sl.bing.net/eGbW5ybZwia',
    description: 'Windows and window frames'
  },
  'Other': {
    category: 'Other',
    imageUrl: 'https://sl.bing.net/f6drwoH9VKK',
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

