import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BuildersPagePublicStats = {
  professionalBuilders: number;
  activePosts: number;
  publishedVideos: number;
  loading: boolean;
  error: boolean;
};

const ZERO: Omit<BuildersPagePublicStats, 'loading' | 'error'> = {
  professionalBuilders: 0,
  activePosts: 0,
  publishedVideos: 0,
};

/**
 * Live directory stats for /builders (hero + footer band). Falls back if RPC missing.
 */
export function useBuildersPagePublicStats(): BuildersPagePublicStats {
  const [state, setState] = useState<BuildersPagePublicStats>({
    ...ZERO,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('get_builders_page_public_stats');

        if (cancelled) return;

        if (!error && data && typeof data === 'object') {
          const row = data as Record<string, unknown>;
          setState({
            professionalBuilders: Number(row.professional_builders) || 0,
            activePosts: Number(row.active_posts) || 0,
            publishedVideos: Number(row.published_videos) || 0,
            loading: false,
            error: false,
          });
          return;
        }

        const { count: postCount } = await supabase
          .from('builder_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        if (cancelled) return;

        setState({
          professionalBuilders: 0,
          activePosts: postCount ?? 0,
          publishedVideos: 0,
          loading: false,
          error: !!error,
        });
      } catch {
        if (!cancelled) {
          setState({ ...ZERO, loading: false, error: true });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Hero / stats display: show live count with + when loaded. */
export function formatBuildersStatCount(n: number, loading: boolean): string {
  if (loading) return '…';
  if (n <= 0) return '0';
  return `${n.toLocaleString()}+`;
}

