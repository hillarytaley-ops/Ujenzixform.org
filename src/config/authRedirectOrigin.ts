/**
 * Origin used for Supabase OAuth `redirectTo` (must match Auth → Redirect URLs).
 * Set VITE_PUBLIC_SITE_URL to your stable Vercel production host (e.g. https://ujenzi-pro.vercel.app)
 * before custom domain go-live. Avoid one-off preview URLs — Vercel deletes them (DEPLOYMENT_NOT_FOUND).
 */
function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function resolveAuthRedirectOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (typeof window !== "undefined") return window.location.origin;

  return "";
}