import { supabase } from '@/integrations/supabase/client';

export const getSafeImageUrl = async (urlLike?: string, expiresIn: number = 600): Promise<string | undefined> => {
  if (!urlLike) return undefined;
  const u = urlLike.trim();
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (u.startsWith('/')) return u;
  const m = u.match(/^([a-z0-9_-]+)\/(.+)$/i);
  if (!m) return u;
  const bucket = m[1];
  const path = m[2];
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {}
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  } catch {}
  return u;
};