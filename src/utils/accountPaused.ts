import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

/** Whether the signed-in user has profiles.is_paused = true. */
export async function fetchAccountPaused(
  userId: string,
  accessToken: string
): Promise<boolean> {
  const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=is_paused&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as { is_paused?: boolean }[];
    return rows?.[0]?.is_paused === true;
  } catch {
    return false;
  }
}
