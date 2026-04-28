/**
 * Canonical product identity: **UjenziXform** (not MradiPro).
 * `mradipro_*` keys below are legacy localStorage/sessionStorage names for one-time migration only.
 * Override URLs via VITE_SITE_URL and optional VITE_SOCIAL_* vars in .env.
 */

export const DEFAULT_SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://ujenzixform.org';

/** Use these URLs in App Store Connect (Privacy Policy, etc.). */
export const PRIVACY_POLICY_URL = `${DEFAULT_SITE_URL}/privacy`;
export const TERMS_OF_SERVICE_URL = `${DEFAULT_SITE_URL}/terms`;

export const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'support@ujenzixform.org';

/** Public footer & Contact — override via VITE_SUPPORT_PHONE_* if numbers change. */
export const SUPPORT_PHONE_PRIMARY = {
  tel: (
    (import.meta.env.VITE_SUPPORT_PHONE_PRIMARY_TEL as string | undefined) || '+254715612073'
  ).replace(/\s/g, ''),
  display:
    (import.meta.env.VITE_SUPPORT_PHONE_PRIMARY_DISPLAY as string | undefined)?.trim() ||
    '+254 715 612 073',
} as const;

export const SUPPORT_PHONE_SECONDARY = {
  tel: (
    (import.meta.env.VITE_SUPPORT_PHONE_SECONDARY_TEL as string | undefined) || '+254733987654'
  ).replace(/\s/g, ''),
  display:
    (import.meta.env.VITE_SUPPORT_PHONE_SECONDARY_DISPLAY as string | undefined)?.trim() ||
    '+254 733 987 654',
} as const;

export const SOCIAL_INSTAGRAM_URL =
  (import.meta.env.VITE_SOCIAL_INSTAGRAM_URL as string | undefined) ||
  'https://instagram.com/ujenzixform';

export const SOCIAL_TIKTOK_URL =
  (import.meta.env.VITE_SOCIAL_TIKTOK_URL as string | undefined) ||
  'https://www.tiktok.com/@ujenzixform';

/** Official WhatsApp chat link (wa.me message link). Override via VITE_SOCIAL_WHATSAPP_URL. */
export const SOCIAL_WHATSAPP_URL =
  (import.meta.env.VITE_SOCIAL_WHATSAPP_URL as string | undefined) ||
  'https://wa.me/message/3VWSHQ4REFLMK1';

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
