import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

export type PublicSupplierDirectoryRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  is_verified: boolean;
  description: string | null;
};

function asDirectoryArray(v: unknown): PublicSupplierDirectoryRow[] {
  if (!Array.isArray(v)) return [];
  return v.filter(Boolean) as PublicSupplierDirectoryRow[];
}

/** Anon-safe supplier rows via SECURITY DEFINER RPC. */
export async function fetchPublicSupplierDirectory(): Promise<PublicSupplierDirectoryRow[]> {
  let accessToken = '';
  try {
    const raw = readPersistedAuthRawStringSync();
    if (raw) {
      const parsed = JSON.parse(raw);
      accessToken = parsed.access_token || '';
    }
  } catch {
    /* ignore */
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  } as const;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_supplier_directory`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('get_public_supplier_directory:', res.status, t?.slice(0, 200));
      return [];
    }
    const json: unknown = await res.json();
    if (typeof json === 'string') {
      try {
        const parsed = JSON.parse(json) as unknown;
        return Array.isArray(parsed) ? asDirectoryArray(parsed) : [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(json)) {
      return asDirectoryArray(json);
    }
    if (json && typeof json === 'object' && 'directory' in (json as object)) {
      return asDirectoryArray((json as { directory: unknown }).directory);
    }
    return [];
  } catch (e) {
    console.warn('get_public_supplier_directory error:', e);
    return [];
  }
}
