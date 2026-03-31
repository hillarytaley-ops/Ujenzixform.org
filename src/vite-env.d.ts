/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  /** When "true", admin dashboard shell requires a Supabase JWT (no staff-only localStorage bypass). */
  readonly VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN?: string;
  /** When "true", allow hardcoded super-admin bootstrap credentials in production (discouraged). */
  readonly VITE_ALLOW_SUPER_ADMIN_FALLBACK?: string;
}
