import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures the browser has a valid Supabase session before RLS-protected reads.
 * Helps when UI role was restored from localStorage but the JWT expired.
 */
export async function refreshSessionIfNeeded(): Promise<{ ok: boolean; userId: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { ok: false, userId: null };
  }

  const exp = session.expires_at;
  if (exp != null && exp * 1000 < Date.now() + 120_000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      return { ok: false, userId: session.user.id };
    }
    return { ok: true, userId: data.session.user.id };
  }

  return { ok: true, userId: session.user.id };
}
