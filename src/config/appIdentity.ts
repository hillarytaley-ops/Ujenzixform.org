/**
 * Canonical product identity and storage keys.
 * Override URLs via VITE_SITE_URL and optional VITE_SOCIAL_* vars in .env.
 */

export const DEFAULT_SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://ujenzixform.org';

export const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'support@ujenzixform.org';

export const SOCIAL_INSTAGRAM_URL =
  (import.meta.env.VITE_SOCIAL_INSTAGRAM_URL as string | undefined) ||
  'https://instagram.com/ujenzixform';

export const SOCIAL_TIKTOK_URL =
  (import.meta.env.VITE_SOCIAL_TIKTOK_URL as string | undefined) ||
  'https://www.tiktok.com/@ujenzixform';

/** localStorage session blob (UX cache; auth is server-verified). */
export const STORAGE_SESSION_KEY = 'ujenzixform_session';
export const STORAGE_SESSION_KEY_LEGACY = 'mradipro_session';

/** sessionStorage encrypted session */
export const STORAGE_SECURE_SESSION_KEY = 'ujenzixform_secure_session';
export const STORAGE_SECURE_SESSION_KEY_LEGACY = 'mradipro_secure_session';

export const STORAGE_ENCRYPTION_KEY_NAME = 'ujenzixform_session_key';
export const STORAGE_ENCRYPTION_KEY_NAME_LEGACY = 'mradipro_session_key';

export const STORAGE_CART_KEY = 'ujenzixform_cart';
export const STORAGE_CART_KEY_LEGACY = 'mradipro_cart';

export const STORAGE_DASHBOARD_LAYOUT_PREFIX = 'ujenzixform_dashboard_layout';
export const STORAGE_DASHBOARD_LAYOUT_PREFIX_LEGACY = 'mradipro_dashboard_layout';
