/**
 * Async role resolution from Supabase session + user_roles (source of truth).
 * Use in auth pages instead of localStorage.getItem('user_role').
 */
import { supabase } from '@/integrations/supabase/client';

export type SessionRole = {
  role: string | null;
  userId: string | null;
};

export async function resolveRoleFromSession(): Promise<SessionRole> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { role: null, userId: null };
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    role: roleRow?.role ?? null,
    userId: user.id,
  };
}
