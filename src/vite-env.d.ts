/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  /** When "true", admin dashboard shell requires a Supabase JWT (no staff-only localStorage bypass). */
  readonly VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN?: string;
  /** When "true", allow hardcoded super-admin bootstrap credentials in production (discouraged). */
  readonly VITE_ALLOW_SUPER_ADMIN_FALLBACK?: string;
  /** When "true", admin staff login uses Edge Function verify-admin-staff-login (extra IP/email throttling). */
  readonly VITE_ADMIN_STAFF_LOGIN_VIA_EDGE?: string;
  /** When "true", camera stream URLs are resolved via Edge Function camera-stream-url (JWT + rate limit; URL still returned to client). */
  readonly VITE_CAMERA_STREAM_VIA_EDGE?: string;
}
