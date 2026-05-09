/**
 * Gates “Staff access” on /auth by email shape. Configure in Vercel / .env:
 *
 * - `VITE_STAFF_EMAIL_DOMAINS` — comma-separated domains (`ujenzixform.org` or `@ujenzixform.org`).
 *   If **unset**, defaults to `ujenzixform.org`. If set to **empty string**, no domain rules (allowlist / session only).
 * - `VITE_STAFF_EMAIL_ALLOWLIST` — optional comma-separated full emails for non-domain staff addresses.
 */

function normalizeDomain(entry: string): string {
  const t = entry.trim().toLowerCase();
  if (!t) return "";
  return t.startsWith("@") ? t.slice(1) : t;
}

function staffDomainsFromEnv(): string[] {
  const raw = import.meta.env.VITE_STAFF_EMAIL_DOMAINS as string | undefined;
  if (raw === undefined) {
    return ["ujenzixform.org"];
  }
  if (raw.trim() === "") {
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

/**
 * True when `email` looks like a staff identifier (domain or allowlist). Does not verify the password.
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
