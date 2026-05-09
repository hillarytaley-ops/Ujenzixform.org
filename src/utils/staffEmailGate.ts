/**
 * Gates “Staff access” on /auth.
 *
 * **Primary:** `admin_staff` emails (active) via Supabase RPC `is_admin_staff_portal_email` — managed in Admin → Staff.
 *
 * **Optional env (Vercel / .hosting):**
 * - `VITE_STAFF_EMAIL_DOMAINS` — comma-separated domains. If **unset**, no domain shortcut (DB + allowlist only). If **empty string**, same.
 * - `VITE_STAFF_EMAIL_ALLOWLIST` — comma-separated full emails (extras not in `admin_staff`).
 */

function normalizeDomain(entry: string): string {
  const t = entry.trim().toLowerCase();
  if (!t) return "";
  return t.startsWith("@") ? t.slice(1) : t;
}

function staffDomainsFromEnv(): string[] {
  const raw = import.meta.env.VITE_STAFF_EMAIL_DOMAINS as string | undefined;
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((s) => normalizeDomain(s))
    .filter(Boolean);
}

function staffAllowlistFromEnv(): string[] {
  const raw = import.meta.env.VITE_STAFF_EMAIL_ALLOWLIST as string | undefined;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Basic shape check before calling `is_admin_staff_portal_email`. */
export function emailLooksCompleteForStaffCheck(email: string): boolean {
  const e = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * True when `email` matches optional env domain / allowlist (supplements DB staff list). Does not verify the password.
 */
export function isStaffEmailIdentifier(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return false;

  const allow = staffAllowlistFromEnv();
  if (allow.includes(e)) return true;

  const at = e.lastIndexOf("@");
  if (at < 1 || at === e.length - 1) return false;
  const host = e.slice(at + 1);
  if (!host) return false;

  for (const d of staffDomainsFromEnv()) {
    if (host === d) return true;
  }
  return false;
}

type RpcClient = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

/**
 * True when `email` matches an **active** row in `admin_staff` (same list as Admin → Staff).
 */
export async function fetchIsAdminStaffPortalEmail(
  client: RpcClient,
  email: string
): Promise<boolean> {
  const e = email.trim();
  if (!emailLooksCompleteForStaffCheck(e)) return false;
  const { data, error } = await client.rpc("is_admin_staff_portal_email", { p_email: e });
  if (error) {
    console.warn("[staffEmailGate] is_admin_staff_portal_email:", error.message);
    return false;
  }
  return data === true;
}
