// Content Security Policy configuration
// Environment-aware CSP directives for enhanced security
//
// - style-src 'unsafe-inline': required because the app uses many React `style={{...}}` attributes
//   and JSX `<style>` blocks (e.g. Monitoring, charts, QR scanners). Removing it needs a large
//   migration to CSS modules / external sheets + nonces.
// - script-src (production): no 'unsafe-inline' — GA is bootstrapped from same-origin
//   `/ga-bootstrap.js` when `VITE_GA_MEASUREMENT_ID` is set (see vite.config.ts). Dev still allows
//   inline/eval for Vite HMR and the GA dev loader.
import { SUPABASE_URL } from '@/integrations/supabase/client';

const isDevelopment = import.meta.env.MODE === 'development';

const supabaseWss = SUPABASE_URL.replace(/^https:/i, 'wss:');

/** Third-party script hosts (Stripe, Turnstile, GA loader, Paystack checkout). */
const SCRIPT_HOSTS = [
  SUPABASE_URL,
  'https://challenges.cloudflare.com',
  'https://js.stripe.com',
  'https://www.googletagmanager.com',
  'https://js.paystack.co',
  'https://maps.googleapis.com',
  'https://www.google.com',
  'https://www.gstatic.com',
] as const;

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
    ...SCRIPT_HOSTS,
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // React inline styles + JSX <style> (see file header)
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    SUPABASE_URL,
    'https://*.supabase.co',
    'https://images.unsplash.com', // For placeholder images
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://*.tile.openstreetmap.org',
    'https://*.basemaps.cartocdn.com',
    'https://commondatastorage.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    SUPABASE_URL,
    'https://*.supabase.co',
    'https://ipapi.co',
    'https://api.ipify.org',
    'https://api.stripe.com', // For payment processing
    'https://api.paystack.co',
    'https://*.ingest.sentry.io',
    'https://*.ingest.de.sentry.io',
    'https://*.sentry.io',
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://analytics.google.com',
    'https://www.googletagmanager.com',
    'https://maps.googleapis.com',
    'https://*.googleapis.com',
    'https://nominatim.openstreetmap.org',
    'https://www.google.com',
    supabaseWss // WebSocket connections
  ],
  'frame-src': [
    "'self'",
    'https://www.google.com',
    'https://challenges.cloudflare.com',
    'https://js.stripe.com', // For Stripe Elements
    'https://checkout.paystack.com',
    'https://www.youtube.com', // For YouTube video embeds
    'https://youtube.com', // For YouTube video embeds
    'https://player.vimeo.com', // For Vimeo video embeds
    'https://vimeo.com' // For Vimeo video embeds
  ],
  'worker-src': [
    "'self'",
    'blob:' // For service workers
  ],
  'manifest-src': ["'self'"],
  'media-src': ["'self'", 'blob:', 'data:', 'https://commondatastorage.googleapis.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': []
};

export const generateCSPHeader = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
};

// Generate nonce for inline scripts in production
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

// Enhanced CSP with nonce support (optional third-party inline scripts)
export const generateCSPWithNonce = (nonce?: string): string => {
  const directives = { ...CSP_DIRECTIVES };
  
  if (!isDevelopment && nonce) {
    directives['script-src'] = directives['script-src'].filter(
      (src) => src !== "'unsafe-inline'" && src !== "'unsafe-eval'"
    );
    directives['script-src'].push(`'nonce-${nonce}'`);
  }
  
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
};

// Inject CSP meta tag into document head
export const injectCSP = (nonce?: string) => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = nonce ? generateCSPWithNonce(nonce) : generateCSPHeader();
  document.head.appendChild(meta);
};

/**
 * Suggested headers for edge/server config. Do **not** set Cross-Origin-Embedder-Policy /
 * Cross-Origin-Opener-Policy to isolate on the main document unless every subresource
 * (Supabase, Stripe, maps, embeds) is compatible — it breaks typical SPA integrations.
 */
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};
