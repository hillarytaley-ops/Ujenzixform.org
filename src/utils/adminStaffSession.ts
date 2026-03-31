/**
 * Validates the admin staff portal session stored in localStorage.
 * Staff may use "limited mode" without a Supabase JWT; do not require sb-*-auth-token for access.
 */
export const ADMIN_STAFF_SESSION_MAX_MS = 24 * 60 * 60 * 1000;

const SUPABASE_AUTH_TOKEN_KEY = "sb-wuuyjjpgzgeimiptuuws-auth-token";

function parseStoredSupabaseToken(): { access_token?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
}

/** Staff portal: admin_authenticated + admin_email + admin_login_time + role (24h). */
export function isAdminStaffLocalSessionValid(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("admin_authenticated") !== "true") return false;
  const role = localStorage.getItem("user_role");
  if (role !== "admin" && role !== "super_admin") return false;
  const email = localStorage.getItem("admin_email");
  if (!email || !email.trim()) return false;
  const loginTime = localStorage.getItem("admin_login_time");
  if (!loginTime) return false;
  const age = Date.now() - parseInt(loginTime, 10);
  if (Number.isNaN(age) || age < 0 || age > ADMIN_STAFF_SESSION_MAX_MS) return false;
  return true;
}

/**
 * Signed in via main app (AuthContext): Supabase session + user_roles synced to localStorage.
 * Server still enforces RLS; this only gates the SPA shell.
 */
export function isLikelySupabaseAdminUser(): boolean {
  if (typeof window === "undefined") return false;
  if (!parseStoredSupabaseToken()) return false;
  const role = localStorage.getItem("user_role");
  return role === "admin" || role === "super_admin";
}

function requireSupabaseSessionForAdminShell(): boolean {
  try {
    return import.meta.env.VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN === "true";
  } catch {
    return false;
  }
}

/** Either staff portal session OR Supabase admin (e.g. after /auth). */
export function canAccessAdminDashboardStorage(): boolean {
  if (requireSupabaseSessionForAdminShell()) {
    return isLikelySupabaseAdminUser();
  }
  return isAdminStaffLocalSessionValid() || isLikelySupabaseAdminUser();
}
