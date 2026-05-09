import { supabase } from '@/integrations/supabase/client';

type ShowcaseRow = Record<string, unknown>;

/**
 * Loads published builder_videos for visitors. Prefer SECURITY DEFINER RPC so
 * Project Showcase matches hero stats when table RLS is mis-deployed.
 */
export async function fetchPublicBuilderShowcaseVideos(options: {
  builderId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ data: ShowcaseRow[]; usedRpc: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 80, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const p_builder_id =
    options.builderId && String(options.builderId).trim().length > 0
      ? String(options.builderId).trim()
      : null;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_public_builder_showcase_videos',
    {
      p_limit: limit,
      p_offset: offset,
      p_builder_id,
    }
  );

  if (!rpcError && Array.isArray(rpcData)) {
    return { data: rpcData as ShowcaseRow[], usedRpc: true };
  }

  let q = supabase.from('builder_videos').select('*').order('created_at', { ascending: false });

  if (p_builder_id) {
    q = q.eq('builder_id', p_builder_id);
  }

  const { data: restData, error: restError } = await q;
  if (restError) {
    console.warn('fetchPublicBuilderShowcaseVideos REST fallback:', restError.message);
    return { data: [], usedRpc: false };
  }

  const rows = (restData || []) as ShowcaseRow[];
  const visible = rows.filter((r) => {
    const pub = r.is_published;
    return pub === true || pub === null;
  });
  return { data: visible, usedRpc: false };
}
