/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📊 GOOGLE ANALYTICS - UjenziPro                                                    ║
 * ║                                                                                      ║
 * ║   CREATED: January 22, 2026                                                          ║
 * ║   SETUP:                                                                             ║
 * ║   1. Create GA4 property at https://analytics.google.com                             ║
 * ║   2. Get Measurement ID (G-XXXXXXXXXX)                                               ║
 * ║   3. Add to .env: VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX                               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Check if GA is available
const isGAAvailable = () => {
  return typeof window !== 'undefined' && GA_MEASUREMENT_ID && window.gtag;
};

/**
 * Initialize Google Analytics
 * Call this in main.tsx or App.tsx
 */
export const initGoogleAnalytics = () => {
  if (!GA_MEASUREMENT_ID) {
    console.log('📊 Google Analytics not configured (VITE_GA_MEASUREMENT_ID missing)');
    return;
  }

  // Add GA script to head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname,
      send_page_view: true
    });
  `;
  document.head.appendChild(script2);

  // Make gtag available globally
  window.gtag = window.gtag || function() {
    (window.dataLayer = window.dataLayer || []).push(arguments);
  };

  console.log('✅ Google Analytics initialized');
};

/**
 * Track page views
 * Call this on route changes
 */
export const trackPageView = (path: string, title?: string) => {
  if (!isGAAvailable()) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track custom events
 */
export const trackEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>
) => {
  if (!isGAAvailable()) return;

  window.gtag('event', eventName, params);
};

// ============================================
// PRE-DEFINED EVENTS FOR UJENZIPRO
// ============================================

/**
 * Track user registration
 */
export const trackRegistration = (role: string, method: string = 'email') => {
  trackEvent('sign_up', {
    method,
    role,
  });
};

/**
 * Track user login
 */
export const trackLogin = (role: string, method: string = 'email') => {
  trackEvent('login', {
    method,
    role,
  });
};

/**
 * Track product view
 */
export const trackProductView = (productId: string, productName: string, category: string, price: number) => {
  trackEvent('view_item', {
    currency: 'KES',
    value: price,
    items: [{
      item_id: productId,
      item_name: productName,
      item_category: category,
      price,
    }],
  });
};

/**
 * Track add to cart
 */
export const trackAddToCart = (
  productId: string,
  productName: string,
  category: string,
  price: number,
  quantity: number
) => {
  trackEvent('add_to_cart', {
    currency: 'KES',
    value: price * quantity,
    items: [{
      item_id: productId,
      item_name: productName,
      item_category: category,
      price,
      quantity,
    }],
  });
};

/**
 * Track remove from cart
 */
export const trackRemoveFromCart = (
  productId: string,
  productName: string,
  price: number,
  quantity: number
) => {
  trackEvent('remove_from_cart', {
    currency: 'KES',
    value: price * quantity,
    items: [{
      item_id: productId,
      item_name: productName,
      price,
      quantity,
    }],
  });
};

/**
 * Track checkout initiation
 */
export const trackBeginCheckout = (
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  totalValue: number
) => {
  trackEvent('begin_checkout', {
    currency: 'KES',
    value: totalValue,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

/**
 * Track purchase completion
 */
export const trackPurchase = (
  transactionId: string,
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  totalValue: number,
  paymentMethod: string
) => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'KES',
    value: totalValue,
    payment_type: paymentMethod,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

/**
 * Track quote request
 */
export const trackQuoteRequest = (
  supplierId: string,
  supplierName: string,
  itemCount: number,
  estimatedValue: number
) => {
  trackEvent('quote_request', {
    supplier_id: supplierId,
    supplier_name: supplierName,
    item_count: itemCount,
    estimated_value: estimatedValue,
  });
};

/**
 * Track delivery order
 */
export const trackDeliveryOrder = (orderId: string, deliveryAddress: string) => {
  trackEvent('delivery_order', {
    order_id: orderId,
    delivery_address: deliveryAddress,
  });
};

/**
 * Track search
 */
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

/**
 * Track QR scan
 */
export const trackQRScan = (scanType: 'dispatch' | 'receive', orderId: string) => {
  trackEvent('qr_scan', {
    scan_type: scanType,
    order_id: orderId,
  });
};

/**
 * Track support chat opened
 */
export const trackSupportChatOpened = () => {
  trackEvent('support_chat_opened');
};

/**
 * Track error occurrence
 */
export const trackError = (errorType: string, errorMessage: string) => {
  trackEvent('error', {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Limit length
  });
};

// Type declaration for gtag
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

