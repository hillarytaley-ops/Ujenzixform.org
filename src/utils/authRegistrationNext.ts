/**
 * Allowlisted paths for `?next=` on `/auth` after sign-in / sign-up (e.g. from registration QR flow).
 * Only same-origin relative paths; rejects open redirects.
 */
export const POST_AUTH_REGISTRATION_PATHS = new Set([
  "/supplier-registration",
  "/private-client-registration",
  "/private-builder-registration",
  "/professional-builder-registration",
]);

export function sanitizeRegistrationNextPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (!pathOnly || !POST_AUTH_REGISTRATION_PATHS.has(pathOnly)) return null;
  return pathOnly;
}

/** Map `/register/scan/:kind` route param → registration path (must stay in sync with POST_AUTH_REGISTRATION_PATHS). */
export const REGISTRATION_SCAN_KIND_TO_PATH: Record<string, string> = {
  supplier: "/supplier-registration",
  "private-builder": "/private-client-registration",
  "professional-builder": "/professional-builder-registration",
};
