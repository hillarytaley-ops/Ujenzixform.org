import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BuildersPagePublicStats = {
  professionalBuilders: number;
  /** Timeline posts visible to the anon client (RLS); may be lower than DB total from stats RPC */
  activePosts: number;
  publishedVideos: number;
  /** First page of builder_posts from same SECURITY DEFINER RPC (when supported). */
  timelinePage: Record<string, unknown>[] | null;
  loading: boolean;
  error: boolean;
};

const ZERO: Omit<BuildersPagePublicStats, 'loading' | 'error'> = {
  professionalBuilders: 0,
  activePosts: 0,
  publishedVideos: 0,
  timelinePage: null,
};

function parseTimelinePageField(row: Record<string, unknown>): Record<string, unknown>[] | null {
  const tp = row.timeline_page;
  if (Array.isArray(tp)) return tp as Record<string, unknown>[];
  if (typeof tp === 'string') {
    try {
      const parsed = JSON.parse(tp) as unknown;
      return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

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
        const FEED_PAGE = 11;
        let data: unknown = null;
        let rpcError: unknown = null;

        const withFeed = await (supabase as any).rpc('get_builders_page_public_stats', {
          p_feed_limit: FEED_PAGE,
          p_feed_offset: 0,
        });
        if (!withFeed.error && withFeed.data && typeof withFeed.data === 'object') {
          data = withFeed.data;
        } else {
          const noFeed = await (supabase as any).rpc('get_builders_page_public_stats');
          data = noFeed.data;
          rpcError = noFeed.error;
        }

        if (cancelled) return;

        if (!rpcError && data && typeof data === 'object' && !Array.isArray(data)) {
          const row = data as Record<string, unknown>;
          const rpcActivePosts = Number(row.active_posts) || 0;
          let timelinePage = parseTimelinePageField(row);

          let anonPostCount: number | null = null;
          try {
            let { count, error: cntErr } = await supabase
              .from('builder_posts')
              .select('id', { count: 'exact', head: true })
              .or('status.eq.active,status.is.null');
            if (cntErr) {
              const retry = await supabase
                .from('builder_posts')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active');
              count = retry.count;
              cntErr = retry.error;
            }
            if (!cntErr && count !== null && count !== undefined) {
              anonPostCount = count;
            }
          } catch {
            anonPostCount = null;
          }

          if (anonPostCount === null && rpcActivePosts > 0) {
            const probe = await supabase
              .from('builder_posts')
              .select('id')
              .or('status.eq.active,status.is.null')
              .limit(1);
            if (!probe.error && (!probe.data || probe.data.length === 0)) {
              anonPostCount = 0;
            }
          }

          const activePostsVisible =
            anonPostCount !== null ? anonPostCount : rpcActivePosts;

          const tryFillTimeline =
            !timelinePage?.length &&
            (anonPostCount !== null ? anonPostCount > 0 : rpcActivePosts > 0);

          if (tryFillTimeline) {
            const { data: rows, error: rowsErr } = await supabase
              .from('builder_posts')
              .select('*')
              .or('status.eq.active,status.is.null')
              .order('created_at', { ascending: false })
              .limit(11);
            if (!rowsErr && Array.isArray(rows) && rows.length > 0) {
              timelinePage = rows as Record<string, unknown>[];
            }
          }

          setState({
            professionalBuilders: Number(row.professional_builders) || 0,
            activePosts: activePostsVisible,
            publishedVideos: Number(row.published_videos) || 0,
            timelinePage,
            loading: false,
            error: false,
          });
          return;
        }

        const { count: postCount } = await supabase
          .from('builder_posts')
          .select('id', { count: 'exact', head: true })
          .or('status.eq.active,status.is.null');

        if (cancelled) return;

        setState({
          professionalBuilders: 0,
          activePosts: postCount ?? 0,
          publishedVideos: 0,
          timelinePage: null,
          loading: false,
          error: !!rpcError,
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

