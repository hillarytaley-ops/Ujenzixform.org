import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HomePagePublicStats = {
  professionalBuilders: number;
  supplierCompanies: number;
  builderProjects: number;
  deliveryProviders: number;
  registeredNetwork: number;
  loading: boolean;
  error: boolean;
};

const ZERO: Omit<HomePagePublicStats, 'loading' | 'error'> = {
  professionalBuilders: 0,
  supplierCompanies: 0,
  builderProjects: 0,
  deliveryProviders: 0,
  registeredNetwork: 0,
};

/**
 * Live aggregates for the public home page hero. Falls back gracefully if RPC is missing.
 */
export function useHomePagePublicStats(): HomePagePublicStats {
  const [state, setState] = useState<HomePagePublicStats>({
    ...ZERO,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('get_home_page_public_stats');

        if (cancelled) return;

        if (!error && data && typeof data === 'object') {
          const row = data as Record<string, unknown>;
          setState({
            professionalBuilders: Number(row.professional_builders) || 0,
            supplierCompanies: Number(row.supplier_companies) || 0,
            builderProjects: Number(row.builder_projects) || 0,
            deliveryProviders: Number(row.delivery_providers) || 0,
            registeredNetwork: Number(row.registered_network) || 0,
            loading: false,
            error: false,
          });
          return;
        }

        setState({ ...ZERO, loading: false, error: !!error });
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

/** Display: live count with + when loaded and n > 0; 0 when zero; … while loading. */
export function formatHomeStatCount(n: number, loading: boolean): string {
  if (loading) return '…';
  if (n <= 0) return '0';
  return `${n.toLocaleString()}+`;
}
