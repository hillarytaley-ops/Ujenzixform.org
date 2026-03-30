/**
 * Validates the admin staff portal session stored in localStorage.
 * Staff may use "limited mode" without a Supabase JWT; do not require sb-*-auth-token for access.
 */
export const ADMIN_STAFF_SESSION_MAX_MS = 24 * 60 * 60 * 1000;

export function isAdminStaffLocalSessionValid(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("admin_authenticated") !== "true") return false;
  if (localStorage.getItem("user_role") !== "admin") return false;
  const email = localStorage.getItem("admin_email");
  if (!email || !email.trim()) return false;
  const loginTime = localStorage.getItem("admin_login_time");
  if (!loginTime) return false;
  const age = Date.now() - parseInt(loginTime, 10);
  if (Number.isNaN(age) || age < 0 || age > ADMIN_STAFF_SESSION_MAX_MS) return false;
  return true;
}
