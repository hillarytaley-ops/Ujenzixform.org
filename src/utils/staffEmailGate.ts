/**
 * Gates “Staff access” on /auth.
 *
 * **Primary:** Edge function `is-admin-staff-portal-email` (rate limited).
 * **Env:** `VITE_STAFF_EMAIL_DOMAINS`, `VITE_STAFF_EMAIL_ALLOWLIST` for extras.
 */

import { edgeIsAdminStaffPortalEmail } from '@/utils/edgeGuestPublic';

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

/** Basic shape check before calling staff portal Edge gate. */
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

/**
 * True when `email` matches an **active** row in `admin_staff`.
 * Uses rate-limited Edge function only (no direct RPC — prevents enumeration).
 */
export async function fetchIsAdminStaffPortalEmail(
  _client: unknown,
  email: string
): Promise<boolean> {
  const e = email.trim();
  if (!emailLooksCompleteForStaffCheck(e)) return false;
  return edgeIsAdminStaffPortalEmail(e);
}
