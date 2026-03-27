// Content Security Policy configuration
// Environment-aware CSP directives for enhanced security
import { SUPABASE_URL } from '@/integrations/supabase/client';

const isDevelopment = import.meta.env.MODE === 'development';

const supabaseWss = SUPABASE_URL.replace(/^https:/i, 'wss:');

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []), // Only allow in development
    SUPABASE_URL,
    'https://challenges.cloudflare.com', // For Turnstile CAPTCHA
    'https://js.stripe.com' // For payment processing
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and Tailwind
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    SUPABASE_URL,
    'https://*.supabase.co',
    'https://images.unsplash.com' // For placeholder images
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
    supabaseWss // WebSocket connections
  ],
  'frame-src': [
    "'self'",
    'https://challenges.cloudflare.com',
    'https://js.stripe.com', // For Stripe Elements
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
  'media-src': ["'self'", 'blob:', 'data:'],
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

// Enhanced CSP with nonce support for production
export const generateCSPWithNonce = (nonce?: string): string => {
  const directives = { ...CSP_DIRECTIVES };
  
  // In production, use nonce instead of unsafe-inline for scripts
  if (!isDevelopment && nonce) {
    directives['script-src'] = directives['script-src'].filter(src => 
      src !== "'unsafe-inline'" && src !== "'unsafe-eval'"
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

// Security headers configuration for server-side implementation
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};
