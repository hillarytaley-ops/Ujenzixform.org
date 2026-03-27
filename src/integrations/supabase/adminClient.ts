/**
 * Admin helpers — browser-safe only.
 *
 * The Supabase **service role key must never** be bundled in the SPA (no `VITE_*` service role).
 * Admin dashboards use the normal `supabase` client with JWT + RLS policies for `admin` users.
 * Operations that truly need service role (e.g. Auth Admin API) belong in Edge Functions with secrets server-side.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * @deprecated Always null. Do not use — import `supabase` from `@/integrations/supabase/client` instead.
 * Retained temporarily so old call sites can be removed; prefer deleting `getAdminClient() || supabase` patterns.
 */
export const getAdminClient = (): null => {
  return null;
};

export const isAdminClientAvailable = (): boolean => false;

/**
 * Verifies the given email matches the signed-in user and that user has role `admin`.
 * Uses only the anon/authenticated client (RLS must allow the read on `user_roles`).
 */
export const verifyAdminAccess = async (email: string): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email || user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return false;
    }
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (error) return false;
    return data?.role === 'admin';
  } catch {
    return false;
  }
};

export default getAdminClient;
