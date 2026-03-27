/**
 * Read user_roles via PostgREST fetch (not supabase-js .from).
 * Avoids auth-client deadlocks/hangs that block RoleProtectedRoute after SPA navigate from /auth.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

const DEFAULT_TIMEOUT_MS = 14_000;

function normalizeRoleToken(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export async function fetchUserRolesViaRest(
  userId: string,
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string[]> {
  const url = `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role`;
  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ac.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('user_roles REST HTTP', res.status, body);
      return [];
    }
    if (!Array.isArray(body)) return [];
    return body
      .map((r: { role?: unknown }) => normalizeRoleToken((r as { role?: unknown }).role))
      .filter(Boolean);
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      console.warn('user_roles REST timeout');
    } else {
      console.error('user_roles REST error:', e);
    }
    return [];
  } finally {
    window.clearTimeout(timer);
  }
}
