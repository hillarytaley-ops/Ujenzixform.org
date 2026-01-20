// ============================================================
// UjenziXform Service Worker - Enhanced PWA Support
// Version: 6.0
// Features: Offline caching, background sync, push notifications,
//           periodic sync, share target, file handling
// ============================================================

const CACHE_VERSION = 'v19';
const STATIC_CACHE = `UjenziXform-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `UjenziXform-dynamic-${CACHE_VERSION}`;
const API_CACHE = `UjenziXform-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `UjenziXform-images-${CACHE_VERSION}`;
const OFFLINE_CACHE = `UjenziXform-offline-${CACHE_VERSION}`;

// Critical assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/UjenziXform-logo.png',
  '/UjenziXform-favicon.svg',
  '/UjenziXform-logo-circular.svg',
];

// Pages to cache for offline access
const OFFLINE_PAGES = [
  '/',
  '/suppliers',
  '/supplier-marketplace',
  '/tracking',
  '/delivery',
  '/builder-dashboard',
  '/supplier-dashboard'
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  '/rest/v1/suppliers',
  '/rest/v1/materials',
  '/rest/v1/admin_material_images',
  '/rest/v1/delivery_requests',
  '/rest/v1/orders',
];

// Maximum items in dynamic cache
const MAX_DYNAMIC_CACHE_ITEMS = 100;
const MAX_IMAGE_CACHE_ITEMS = 200;
const MAX_API_CACHE_AGE = 5 * 60 * 1000; // 5 minutes

// IndexedDB for offline data
const DB_NAME = 'UjenziXform-offline';
const DB_VERSION = 1;

// ============================================================
// INSTALL EVENT - Cache static assets
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing UjenziXform service worker v5...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Pre-cache offline pages
      caches.open(OFFLINE_CACHE).then(async (cache) => {
        console.log('[SW] Pre-caching offline pages');
        for (const page of OFFLINE_PAGES) {
          try {
            const response = await fetch(page);
            if (response.ok) {
              await cache.put(page, response);
            }
          } catch (e) {
            console.log('[SW] Could not cache:', page);
          }
        }
      })
    ])
    .then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// ============================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE, OFFLINE_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================================
// FETCH EVENT - Smart caching strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests (except for share target)
  if (request.method !== 'GET' && !url.pathname.startsWith('/share')) {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle share target
  if (url.pathname === '/share' && request.method === 'POST') {
    event.respondWith(handleShareTarget(request));
    return;
  }

  // Don't intercept module scripts - let them load directly from network
  // This prevents MIME type issues (application/octet-stream vs application/javascript)
  if (request.destination === 'script' || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.mjs') || 
      url.pathname.endsWith('.tsx') ||
      url.pathname.includes('/src/') ||
      url.pathname.includes('/assets/') && url.pathname.endsWith('.js')) {
    // Let module scripts pass through without service worker interception
    return;
  }

  // Strategy selection based on request type
  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithNetwork(request, IMAGE_CACHE));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
  } else if (isPageRequest(request)) {
    event.respondWith(networkFirstWithOffline(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// ============================================================
// CACHING STRATEGIES
// ============================================================

// Network first with cache fallback (for API)
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // ✅ FIX: Only cache complete responses (status 200), not partial (206) or other
    if (networkResponse.ok && networkResponse.status === 200) {
      try {
        const cache = await caches.open(cacheName);
        // Clone and add timestamp
        const responseToCache = networkResponse.clone();
        const headers = new Headers(responseToCache.headers);
        headers.set('sw-cached-at', Date.now().toString());
        
        const cachedResponse = new Response(await responseToCache.blob(), {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers
        });
        
        cache.put(request, cachedResponse);
      } catch (cacheError) {
        // Silently ignore cache errors (e.g., quota exceeded)
        console.log('[SW] Cache put failed:', cacheError.message);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cache is still fresh
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt && (Date.now() - parseInt(cachedAt)) < MAX_API_CACHE_AGE) {
        return cachedResponse;
      }
    }
    
    // Return offline JSON response
    return new Response(
      JSON.stringify({ 
        offline: true, 
        message: 'You are offline. Data will sync when connection is restored.',
        cached_at: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Cache first with network fallback (for static assets)
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(async (networkResponse) => {
      // ✅ FIX: Only cache complete responses (status 200)
      if (networkResponse.ok && networkResponse.status === 200) {
        try {
          const cache = await caches.open(cacheName);
          cache.put(request, networkResponse);
        } catch (e) { /* ignore cache errors */ }
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // ✅ FIX: Only cache complete responses (status 200)
    if (networkResponse.ok && networkResponse.status === 200) {
      try {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        limitCacheSize(cacheName, cacheName === IMAGE_CACHE ? MAX_IMAGE_CACHE_ITEMS : MAX_DYNAMIC_CACHE_ITEMS);
      } catch (e) { /* ignore cache errors */ }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url);
    
    // Return placeholder for images
    if (isImageRequest(request)) {
      return caches.match('/UjenziXform-logo.png');
    }
    
    return caches.match('/offline.html');
  }
}

// Network first with offline page fallback
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await fetch(request);
    
    // ✅ FIX: Only cache complete responses (status 200)
    if (networkResponse.ok && networkResponse.status === 200) {
      try {
        // Cache the page for offline use
        const cache = await caches.open(OFFLINE_CACHE);
        cache.put(request, networkResponse.clone());
      } catch (e) { /* ignore cache errors */ }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Page offline, trying cache:', request.url);
    
    // Try cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try index.html for SPA routes
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Last resort: offline page
    return caches.match('/offline.html');
  }
}

// Stale-while-revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // ✅ FIX: Only cache complete responses (status 200)
      if (networkResponse.ok && networkResponse.status === 200) {
        try {
          cache.put(request, networkResponse.clone());
          limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_ITEMS);
        } catch (e) { /* ignore cache errors */ }
      }
      return networkResponse;
    })
    .catch(() => cachedResponse || caches.match('/offline.html'));
  
  return cachedResponse || fetchPromise;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isApiRequest(url) {
  return url.hostname.includes('supabase.co') && url.pathname.includes('/rest/');
}

function isImageRequest(request) {
  const url = request.url;
  return (
    request.destination === 'image' ||
    url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?.*)?$/i) ||
    url.includes('unsplash.com') ||
    url.includes('blob.vercel-storage.com')
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)(\?.*)?$/i) ||
    STATIC_ASSETS.includes(url.pathname)
  );
}

function isPageRequest(request) {
  return request.mode === 'navigate' || 
         request.destination === 'document' ||
         request.headers.get('accept')?.includes('text/html');
}

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const itemsToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
  }
}

// ============================================================
// SHARE TARGET HANDLER
// ============================================================
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    const files = formData.getAll('images');

    // Store shared data for the app to pick up
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'SHARE_TARGET',
        data: { title, text, url, files: files.length }
      });
      return Response.redirect('/?shared=true', 303);
    }

    // Open the app if not running
    return Response.redirect(`/?shared=true&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, 303);
  } catch (error) {
    console.error('[SW] Share target error:', error);
    return Response.redirect('/', 303);
  }
}

// ============================================================
// BACKGROUND SYNC
// ============================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-orders':
      event.waitUntil(syncPendingOrders());
      break;
    case 'sync-deliveries':
      event.waitUntil(syncPendingDeliveries());
      break;
    case 'sync-quotes':
      event.waitUntil(syncPendingQuotes());
      break;
    case 'sync-cart':
      event.waitUntil(syncCart());
      break;
  }
});

async function syncPendingOrders() {
  console.log('[SW] Syncing pending orders...');
  try {
    const db = await openDB();
    const tx = db.transaction('pending-orders', 'readonly');
    const store = tx.objectStore('pending-orders');
    const orders = await store.getAll();
    
    for (const order of orders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          // Remove from pending
          const deleteTx = db.transaction('pending-orders', 'readwrite');
          await deleteTx.objectStore('pending-orders').delete(order.id);
          
          // Notify user
          self.registration.showNotification('Order Synced', {
            body: `Order ${order.id} has been submitted successfully.`,
            icon: '/UjenziXform-logo.png'
          });
        }
      } catch (e) {
        console.error('[SW] Failed to sync order:', order.id);
      }
    }
  } catch (error) {
    console.error('[SW] Sync orders error:', error);
  }
}

async function syncPendingDeliveries() {
  console.log('[SW] Syncing pending deliveries...');
  // Similar implementation for delivery updates
}

async function syncPendingQuotes() {
  console.log('[SW] Syncing pending quotes...');
  // Similar implementation for quote requests
}

async function syncCart() {
  console.log('[SW] Syncing cart...');
  // Sync cart state across devices
}

// ============================================================
// PERIODIC BACKGROUND SYNC
// ============================================================
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  switch (event.tag) {
    case 'update-prices':
      event.waitUntil(updatePrices());
      break;
    case 'check-orders':
      event.waitUntil(checkOrderUpdates());
      break;
    case 'refresh-materials':
      event.waitUntil(refreshMaterials());
      break;
  }
});

async function updatePrices() {
  console.log('[SW] Updating prices in background...');
  try {
    const response = await fetch('/api/prices/latest');
    if (response.ok) {
      const prices = await response.json();
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/prices', new Response(JSON.stringify(prices)));
    }
  } catch (error) {
    console.error('[SW] Price update error:', error);
  }
}

async function checkOrderUpdates() {
  console.log('[SW] Checking order updates...');
  // Check for order status changes and notify user
}

async function refreshMaterials() {
  console.log('[SW] Refreshing materials cache...');
  try {
    const response = await fetch('/api/materials');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/materials', response);
    }
  } catch (error) {
    console.error('[SW] Materials refresh error:', error);
  }
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = { 
    title: 'UjenziXform', 
    body: 'You have a new notification',
    icon: '/UjenziXform-logo.png',
    badge: '/UjenziXform-favicon.svg'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/UjenziXform-logo.png',
    badge: data.badge || '/UjenziXform-favicon.svg',
    vibrate: [100, 50, 100, 50, 100],
    tag: data.tag || `UjenziXform-${Date.now()}`,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data
    },
    actions: data.actions || [
      { action: 'view', title: '👁️ View', icon: '/icons/view.png' },
      { action: 'dismiss', title: '✕ Dismiss', icon: '/icons/dismiss.png' }
    ]
  };
  
  // Add image if provided
  if (data.image) {
    options.image = data.image;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if not
        return clients.openWindow(urlToOpen);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  // Track notification dismissals for analytics
});

// ============================================================
// MESSAGE EVENT - Communication with main app
// ============================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data?.type);
  
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(cacheNames.map((cache) => caches.delete(cache)));
        }).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE).then((cache) => {
          return cache.addAll(event.data.urls || []);
        })
      );
      break;
      
    case 'SAVE_OFFLINE':
      event.waitUntil(saveForOffline(event.data.data));
      break;
      
    case 'GET_OFFLINE_DATA':
      event.waitUntil(
        getOfflineData(event.data.key).then((data) => {
          event.ports[0]?.postMessage({ data });
        })
      );
      break;
  }
});

// ============================================================
// INDEXEDDB HELPERS
// ============================================================
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores for offline data
      if (!db.objectStoreNames.contains('pending-orders')) {
        db.createObjectStore('pending-orders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-quotes')) {
        db.createObjectStore('pending-quotes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline-data')) {
        db.createObjectStore('offline-data', { keyPath: 'key' });
      }
    };
  });
}

async function saveForOffline(data) {
  try {
    const db = await openDB();
    const tx = db.transaction('offline-data', 'readwrite');
    await tx.objectStore('offline-data').put(data);
    console.log('[SW] Data saved for offline:', data.key);
  } catch (error) {
    console.error('[SW] Save offline error:', error);
  }
}

async function getOfflineData(key) {
  try {
    const db = await openDB();
    const tx = db.transaction('offline-data', 'readonly');
    return await tx.objectStore('offline-data').get(key);
  } catch (error) {
    console.error('[SW] Get offline data error:', error);
    return null;
  }
}

// ============================================================
// ERROR HANDLING
// ============================================================
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  // ✅ FIX: Suppress cache-related errors to reduce console spam
  const reason = event.reason?.message || String(event.reason);
  if (reason.includes('Cache') || reason.includes('cache') || reason.includes('206')) {
    event.preventDefault(); // Suppress the error
    return;
  }
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] UjenziXform Service Worker loaded - Version:', CACHE_VERSION);
