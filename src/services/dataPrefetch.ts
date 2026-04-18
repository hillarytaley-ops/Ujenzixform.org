import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { warmBuilderInvoicesHub } from '@/lib/builderInvoicesHubCache';
import { logger } from '@/utils/logger';

/** Dashboard listens so `profile.id` matches hub cache key before slow `profiles` query finishes. */
export const UJENZI_BUILDER_PREFETCH_PROFILE_EVENT = 'ujenzi-builder-prefetch-profile';
/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📦 DATA PREFETCH SERVICE - PRELOAD DASHBOARD DATA ON LOGIN                        ║
 * ║                                                                                      ║
 * ║   This service prefetches critical data during login to make dashboard              ║
 * ║   loading instant. Data is cached in localStorage and memory.                       ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */
// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// In-memory cache for instant access
const memoryCache: Record<string, { data: any; timestamp: number }> = {};

interface PrefetchResult {
  orders?: any[];
  quotes?: any[];
  products?: any[];
  analytics?: any;
  supplierId?: string;
  profile?: any;
}

/**
 * Get data from cache (memory first, then localStorage)
 */
export const getCachedData = (key: string): any | null => {
  // Check memory cache first (fastest)
  const memCached = memoryCache[key];
  if (memCached && Date.now() - memCached.timestamp < CACHE_EXPIRY_MS) {
    logger.debug(`Memory cache hit for ${key}`, undefined, 'Prefetch');
    return memCached.data;
  }

  // Check localStorage
  try {
    const cached = localStorage.getItem(`prefetch_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        logger.debug(`localStorage cache hit for ${key}`, undefined, 'Prefetch');
        // Also store in memory for faster subsequent access
        memoryCache[key] = { data: parsed.data, timestamp: parsed.timestamp };
        return parsed.data;
      }
    }
  } catch (e) {
    logger.warn('Prefetch cache read error', e, 'Prefetch');
  }

  return null;
};

/**
 * Store data in cache (both memory and localStorage)
 */
const setCachedData = (key: string, data: any): void => {
  const timestamp = Date.now();
  
  // Store in memory
  memoryCache[key] = { data, timestamp };
  
  // Store in localStorage (with size limit check)
  try {
    const payload = JSON.stringify({ data, timestamp });
    // Only cache if under 500KB to avoid localStorage limits
    if (payload.length < 500000) {
      localStorage.setItem(`prefetch_${key}`, payload);
    }
  } catch (e) {
    logger.warn('Prefetch cache write error', e, 'Prefetch');
  }
};

/**
 * Clear all prefetch cache
 */
export const clearPrefetchCache = (): void => {
  // Clear memory cache
  Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  
  // Clear localStorage prefetch items
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('prefetch_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  logger.debug('Cache cleared', undefined, 'Prefetch');
};

/**
 * Make a fast API request with timeout
 */
const fastFetch = async (url: string, accessToken: string, timeoutMs: number = 5000): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
};

/**
 * Prefetch supplier-specific data
 */
const prefetchSupplierData = async (userId: string, accessToken: string): Promise<PrefetchResult> => {
  logger.debug('Starting supplier data prefetch…', undefined, 'Prefetch');
  const result: PrefetchResult = {};
  
  // First, get the supplier ID
  let supplierId: string | null = localStorage.getItem('supplier_id');
  
  if (!supplierId) {
    // Try to find supplier by user_id
    const suppliers = await fastFetch(
      `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${userId}&select=id,company_name`,
      accessToken,
      3000
    );
    
    if (suppliers && suppliers.length > 0) {
      supplierId = suppliers[0].id as string;
      localStorage.setItem('supplier_id', supplierId);
      logger.debug(`Found supplier ID: ${supplierId}`, undefined, 'Prefetch');
    } else {
      // Try via profile
      const profiles = await fastFetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
        accessToken,
        2000
      );
      
      if (profiles && profiles.length > 0) {
        const profileId = profiles[0].id as string;
        const suppliersByProfile = await fastFetch(
          `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${profileId}&select=id,company_name`,
          accessToken,
          2000
        );
        
        if (suppliersByProfile && suppliersByProfile.length > 0) {
          supplierId = suppliersByProfile[0].id as string;
          localStorage.setItem('supplier_id', supplierId);
        }
      }
    }
  }
  
  if (!supplierId) {
    supplierId = userId; // Fallback
  }
  
  result.supplierId = supplierId;
  
  // purchase_orders has no guaranteed `order_type` column in DB — filtering it caused PostgREST 400.
  // Quote-style rows are identified the same way as OrderManagement (po_number prefix QR-).
  const [orders, products, materialItems] = await Promise.all([
    fastFetch(
      `${SUPABASE_URL}/rest/v1/purchase_orders?or=(supplier_id.eq.${userId},supplier_id.eq.${supplierId})&order=created_at.desc&limit=120`,
      accessToken,
      5000
    ),
    fastFetch(
      `${SUPABASE_URL}/rest/v1/supplier_product_prices?supplier_id=eq.${supplierId}&select=*&limit=200`,
      accessToken,
      4000
    ),
    fastFetch(
      `${SUPABASE_URL}/rest/v1/material_items?supplier_id=eq.${supplierId}&order=created_at.desc&limit=200`,
      accessToken,
      4000
    ),
  ]);

  const quotes = Array.isArray(orders)
    ? orders
        .filter((o: any) => {
          const pn = String(o.po_number ?? '');
          return pn.startsWith('QR-');
        })
        .slice(0, 50)
    : null;
  
  // Cache the results
  if (orders) {
    result.orders = orders;
    setCachedData(`supplier_orders_${supplierId}`, orders);
    logger.debug(`Cached ${orders.length} orders`, undefined, 'Prefetch');
  }
  
  if (quotes) {
    result.quotes = quotes;
    setCachedData(`supplier_quotes_${supplierId}`, quotes);
    logger.debug(`Cached ${quotes.length} quotes`, undefined, 'Prefetch');
  }
  
  if (products) {
    result.products = products;
    setCachedData(`supplier_products_${supplierId}`, products);
    logger.debug(`Cached ${products.length} products`, undefined, 'Prefetch');
  }
  
  if (materialItems) {
    setCachedData(`supplier_qrcodes_${supplierId}`, materialItems);
    console.log('📦 Prefetch: Cached', materialItems.length, 'QR codes');
  }
  
  // Calculate analytics summary
  if (orders) {
    const analytics = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
      confirmedOrders: orders.filter((o: any) => o.status === 'confirmed' || o.status === 'accepted').length,
      shippedOrders: orders.filter((o: any) => o.status === 'shipped').length,
      deliveredOrders: orders.filter((o: any) => o.status === 'delivered').length,
      totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
    };
    result.analytics = analytics;
    setCachedData(`supplier_analytics_${supplierId}`, analytics);
    console.log('📦 Prefetch: Calculated analytics summary');
  }
  
  return result;
};

/**
 * Prefetch builder-specific data
 */
const prefetchBuilderData = async (userId: string, accessToken: string): Promise<PrefetchResult> => {
  console.log('📦 Prefetch: Starting builder data prefetch...');
  const result: PrefetchResult = {};
  
  // Get profile ID
  const profiles = await fastFetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id,full_name`,
    accessToken,
    2000
  );
  
  const profileId = profiles?.[0]?.id || userId;
  if (profiles?.[0]) {
    result.profile = profiles[0];
    setCachedData(`builder_profile_${userId}`, profiles[0]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UJENZI_BUILDER_PREFETCH_PROFILE_EVENT, { detail: { userId } }));
    }
  }

  // Same hub as Invoices DN/GRN/Invoice — warms during login prefetch so subtabs are not stuck on skeletons.
  warmBuilderInvoicesHub(userId, profiles?.[0]?.id ?? undefined);

  // Prefetch data in parallel
  const [orders, projects, trackingNumbers] = await Promise.all([
    // Fetch orders
    fastFetch(
      `${SUPABASE_URL}/rest/v1/purchase_orders?or=(buyer_id.eq.${userId},buyer_id.eq.${profileId})&order=created_at.desc&limit=50`,
      accessToken,
      4000
    ),
    // Fetch projects
    fastFetch(
      `${SUPABASE_URL}/rest/v1/builder_projects?builder_id=eq.${userId}&order=created_at.desc&limit=20`,
      accessToken,
      3000
    ),
    // Fetch tracking numbers
    fastFetch(
      `${SUPABASE_URL}/rest/v1/tracking_numbers?or=(builder_id.eq.${userId},builder_id.eq.${profileId})&order=created_at.desc&limit=30`,
      accessToken,
      3000
    ),
  ]);
  
  if (orders) {
    result.orders = orders;
    setCachedData(`builder_orders_${userId}`, orders);
    console.log('📦 Prefetch: Cached', orders.length, 'builder orders');
  }
  
  if (projects) {
    setCachedData(`builder_projects_${userId}`, projects);
    console.log('📦 Prefetch: Cached', projects.length, 'projects');
  }
  
  if (trackingNumbers) {
    setCachedData(`builder_tracking_${userId}`, trackingNumbers);
    console.log('📦 Prefetch: Cached', trackingNumbers.length, 'tracking numbers');
  }
  
  return result;
};

/**
 * Prefetch delivery provider data
 */
const prefetchDeliveryData = async (userId: string, accessToken: string): Promise<PrefetchResult> => {
  console.log('📦 Prefetch: Starting delivery provider data prefetch...');
  const result: PrefetchResult = {};

  // Resolve delivery_providers.id first — delivery_requests.provider_id is often the provider row UUID, not auth uid
  const profile = await fastFetch(
    `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${userId}&select=*&limit=1`,
    accessToken,
    2000
  );

  if (profile && profile.length > 0) {
    result.profile = profile[0];
    setCachedData(`delivery_profile_${userId}`, profile[0]);
  }

  const dpId = profile?.[0]?.id as string | undefined;
  const orClause =
    dpId && String(dpId) !== String(userId)
      ? `(provider_id.eq.${userId},provider_id.eq.${dpId})`
      : `(provider_id.eq.${userId})`;

  const deliveries = await fastFetch(
    `${SUPABASE_URL}/rest/v1/delivery_requests?or=${orClause}&order=created_at.desc&limit=50`,
    accessToken,
    4000
  );

  if (deliveries) {
    setCachedData(`delivery_requests_${userId}`, deliveries);
    console.log('📦 Prefetch: Cached', deliveries.length, 'delivery requests');
  }

  return result;
};

/**
 * Main prefetch function - call this after successful login
 */
export const prefetchDashboardData = async (
  userId: string,
  role: string,
  accessToken: string
): Promise<PrefetchResult> => {
  console.log('📦 Prefetch: Starting data prefetch for role:', role);
  const startTime = Date.now();
  
  try {
    let result: PrefetchResult = {};
    
    switch (role) {
      case 'supplier':
        result = await prefetchSupplierData(userId, accessToken);
        break;
      case 'professional_builder':
      case 'private_client':
        result = await prefetchBuilderData(userId, accessToken);
        break;
      case 'delivery_provider':
      case 'delivery':
        result = await prefetchDeliveryData(userId, accessToken);
        break;
      case 'admin':
        // Admin data is too large to prefetch efficiently
        console.log('📦 Prefetch: Skipping admin prefetch (data too large)');
        break;
      default:
        console.log('📦 Prefetch: Unknown role, skipping');
    }
    
    const duration = Date.now() - startTime;
    console.log(`📦 Prefetch: Completed in ${duration}ms`);
    
    // Store prefetch timestamp
    localStorage.setItem('prefetch_timestamp', Date.now().toString());
    localStorage.setItem('prefetch_role', role);
    
    return result;
  } catch (error) {
    console.error('📦 Prefetch: Error during prefetch:', error);
    return {};
  }
};

/**
 * Check if prefetch data is fresh
 */
export const isPrefetchFresh = (): boolean => {
  const timestamp = localStorage.getItem('prefetch_timestamp');
  if (!timestamp) return false;
  
  const age = Date.now() - parseInt(timestamp, 10);
  return age < CACHE_EXPIRY_MS;
};

/**
 * Get prefetched orders for the current user
 */
export const getPrefetchedOrders = (userId: string, role: string): any[] | null => {
  const supplierId = localStorage.getItem('supplier_id') || userId;
  
  if (role === 'supplier') {
    return getCachedData(`supplier_orders_${supplierId}`);
  } else if (role === 'professional_builder' || role === 'private_client') {
    return getCachedData(`builder_orders_${userId}`);
  }
  
  return null;
};

/**
 * Get prefetched quotes for suppliers
 */
export const getPrefetchedQuotes = (supplierId: string): any[] | null => {
  return getCachedData(`supplier_quotes_${supplierId}`);
};

/**
 * Get prefetched products for suppliers
 */
export const getPrefetchedProducts = (supplierId: string): any[] | null => {
  return getCachedData(`supplier_products_${supplierId}`);
};

/**
 * Get prefetched QR codes for suppliers
 */
export const getPrefetchedQRCodes = (supplierId: string): any[] | null => {
  return getCachedData(`supplier_qrcodes_${supplierId}`);
};

/**
 * Get prefetched analytics for suppliers
 */
export const getPrefetchedAnalytics = (supplierId: string): any | null => {
  return getCachedData(`supplier_analytics_${supplierId}`);
};

export default {
  prefetchDashboardData,
  getCachedData,
  clearPrefetchCache,
  isPrefetchFresh,
  getPrefetchedOrders,
  getPrefetchedQuotes,
  getPrefetchedProducts,
  getPrefetchedQRCodes,
  getPrefetchedAnalytics,
};
