/**
 * MaterialsService - Optimized data fetching with caching and prefetching
 * 
 * Features:
 * - In-memory cache with TTL
 * - Prefetching next page
 * - Debounced search
 * - Parallel data fetching
 * - Image preloading
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

export interface Material {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unit_price: number;
  in_stock: boolean;
  image_url?: string;
  supplier_id?: string;
  supplier?: {
    company_name: string;
    rating?: number;
  };
  pricing_type?: string;
  variants?: any[];
  additional_images?: string[];
  created_at?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface FetchOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  priceRange?: string;
  inStockOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name';
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PREFETCH_THRESHOLD = 3; // Prefetch when 3 items from end

class MaterialsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private prefetchQueue: Set<string> = new Set();
  private imageCache: Set<string> = new Set();

  private getCacheKey(options: FetchOptions): string {
    return JSON.stringify(options);
  }

  get<T>(options: FetchOptions): T | null {
    const key = this.getCacheKey(options);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(options: FetchOptions, data: T): void {
    const key = this.getCacheKey(options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Image preloading
  preloadImage(url: string): void {
    if (!url || this.imageCache.has(url)) return;
    
    const img = new Image();
    img.src = url;
    this.imageCache.add(url);
  }

  preloadImages(urls: string[]): void {
    urls.forEach(url => this.preloadImage(url));
  }

  // Mark prefetch as pending
  markPrefetching(options: FetchOptions): boolean {
    const key = this.getCacheKey(options);
    if (this.prefetchQueue.has(key)) return false;
    this.prefetchQueue.add(key);
    return true;
  }

  clearPrefetch(options: FetchOptions): void {
    const key = this.getCacheKey(options);
    this.prefetchQueue.delete(key);
  }
}

// Singleton cache instance
const cache = new MaterialsCache();

// Build query URL with filters
function buildQueryUrl(options: FetchOptions): string {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    priceRange,
    inStockOnly,
    sortBy = 'newest'
  } = options;

  const offset = (page - 1) * limit;
  let url = `${SUPABASE_URL}/rest/v1/admin_material_images?is_approved=eq.true`;

  // Select fields - include image_url for display
  url += '&select=id,name,category,description,unit,suggested_price,pricing_type,variants,image_url,created_at';

  // Category filter
  if (category && category !== 'All Categories') {
    url += `&category=eq.${encodeURIComponent(category)}`;
  }

  // Search filter (case-insensitive)
  if (search) {
    url += `&or=(name.ilike.*${encodeURIComponent(search)}*,category.ilike.*${encodeURIComponent(search)}*)`;
  }

  // Sorting
  switch (sortBy) {
    case 'price_asc':
      url += '&order=suggested_price.asc';
      break;
    case 'price_desc':
      url += '&order=suggested_price.desc';
      break;
    case 'name':
      url += '&order=name.asc';
      break;
    case 'newest':
    default:
      url += '&order=created_at.desc';
  }

  // Pagination
  url += `&offset=${offset}&limit=${limit}`;

  return url;
}

// Fetch materials with caching
export async function fetchMaterials(options: FetchOptions = {}): Promise<{
  materials: Material[];
  total: number;
  hasMore: boolean;
}> {
  const { page = 1, limit = 12 } = options;

  // Check cache first
  const cached = cache.get<{ materials: Material[]; total: number }>(options);
  if (cached) {
    console.log('📦 Materials cache hit');
    return {
      ...cached,
      hasMore: cached.total > page * limit
    };
  }

  console.log('📦 Fetching materials from API...');

  try {
    const url = buildQueryUrl(options);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch materials: ${response.status}`);
    }

    const data = await response.json();
    const total = parseInt(response.headers.get('content-range')?.split('/')[1] || '0', 10) || data.length;

    // Transform to Material interface
    const materials: Material[] = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      category: item.category,
      unit: item.unit || 'piece',
      unit_price: item.suggested_price || 0,
      in_stock: true,
      image_url: item.image_url,
      pricing_type: item.pricing_type,
      variants: item.variants,
      created_at: item.created_at
    }));

    // Cache the result
    cache.set(options, { materials, total });

    // Preload images for current page
    const imageUrls = materials
      .filter(m => m.image_url)
      .map(m => m.image_url!);
    cache.preloadImages(imageUrls);

    // Prefetch next page in background
    if (materials.length === limit) {
      prefetchNextPage({ ...options, page: page + 1 });
    }

    return {
      materials,
      total,
      hasMore: total > page * limit
    };
  } catch (error) {
    console.error('Error fetching materials:', error);
    throw error;
  }
}

// Prefetch next page
async function prefetchNextPage(options: FetchOptions): Promise<void> {
  // Don't prefetch if already in progress
  if (!cache.markPrefetching(options)) return;

  try {
    // Small delay to not compete with current request
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const url = buildQueryUrl(options);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const total = parseInt(response.headers.get('content-range')?.split('/')[1] || '0', 10) || data.length;

      const materials: Material[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        category: item.category,
        unit: item.unit || 'piece',
        unit_price: item.suggested_price || 0,
        in_stock: true,
        image_url: item.image_url,
        pricing_type: item.pricing_type,
        variants: item.variants,
        created_at: item.created_at
      }));

      cache.set(options, { materials, total });

      // Preload images for prefetched page
      const imageUrls = materials
        .filter(m => m.image_url)
        .map(m => m.image_url!);
      cache.preloadImages(imageUrls);

      console.log(`📦 Prefetched page ${options.page}`);
    }
  } catch (error) {
    console.log('Prefetch failed (non-critical):', error);
  } finally {
    cache.clearPrefetch(options);
  }
}

// Fetch supplier prices
export async function fetchSupplierPrices(): Promise<Map<string, { price: number; in_stock: boolean; supplier_id: string }>> {
  const cacheKey = { type: 'supplier_prices' } as any;
  const cached = cache.get<Map<string, any>>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/supplier_product_prices?select=product_id,price,in_stock,supplier_id`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch supplier prices');
    }

    const data = await response.json();
    const priceMap = new Map<string, { price: number; in_stock: boolean; supplier_id: string }>();

    data.forEach((item: any) => {
      const existing = priceMap.get(item.product_id);
      if (!existing || item.price < existing.price) {
        priceMap.set(item.product_id, {
          price: item.price,
          in_stock: item.in_stock,
          supplier_id: item.supplier_id
        });
      }
    });

    cache.set(cacheKey, priceMap);
    return priceMap;
  } catch (error) {
    console.error('Error fetching supplier prices:', error);
    return new Map();
  }
}

// Fetch categories with counts
export async function fetchCategories(): Promise<{ name: string; count: number }[]> {
  const cacheKey = { type: 'categories' } as any;
  const cached = cache.get<{ name: string; count: number }[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_material_images?select=category&is_approved=eq.true`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    const categoryCount: Record<string, number> = {};

    data.forEach((item: any) => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    cache.set(cacheKey, categories);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// Debounced search
let searchTimeout: NodeJS.Timeout | null = null;

export function debouncedSearch(
  searchTerm: string,
  options: Omit<FetchOptions, 'search'>,
  callback: (result: { materials: Material[]; total: number; hasMore: boolean }) => void,
  delay: number = 300
): void {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = setTimeout(async () => {
    try {
      const result = await fetchMaterials({ ...options, search: searchTerm });
      callback(result);
    } catch (error) {
      console.error('Search error:', error);
      callback({ materials: [], total: 0, hasMore: false });
    }
  }, delay);
}

// Clear all caches
export function clearMaterialsCache(): void {
  cache.invalidate();
}

// Preload a specific page
export function preloadPage(options: FetchOptions): void {
  prefetchNextPage(options);
}

// Export cache for debugging
export const materialsCache = cache;
