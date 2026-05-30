/**
 * Production security posture — stricter trust boundaries on deployed builds.
 */

/** True on Vite production builds (Vercel, etc.). */
export function isProductionBuild(): boolean {
  return import.meta.env.PROD;
}

/** Admin dashboard requires a live Supabase JWT (no localStorage-only staff bypass). */
export function requireSupabaseSessionForAdminShell(): boolean {
  if (isProductionBuild()) return true;
  return import.meta.env.VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN === "true";
}

/** Role simulation via ?test_role= is dev-only. */
export function allowStaffRoleTestMode(): boolean {
  return import.meta.env.DEV;
}
