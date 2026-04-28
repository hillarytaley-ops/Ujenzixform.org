import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

function edgeFunctionsOrigin(): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;
}

function edgeHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Pre-auth staff tab: Edge (rate-limited) first, then PostgREST RPC fallback when Edge is missing or errors.
 * Requires EXECUTE on public.is_admin_staff_portal_email(text) for anon (see migrations).
 */
export async function edgeIsAdminStaffPortalEmail(p_email: string): Promise<boolean> {
  const normalized = p_email.toLowerCase().trim();
  if (!normalized) return false;

  try {
    const res = await fetch(`${edgeFunctionsOrigin()}/is-admin-staff-portal-email`, {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({ p_email: normalized }),
    });
    if (res.ok) {
      try {
        const j: unknown = await res.json();
        if (j === true) return true;
        if (j === false) return false;
      } catch {
        /* fall through to RPC */
      }
    }
  } catch {
    /* fall through to RPC */
  }

  const { data, error } = await supabase.rpc('is_admin_staff_portal_email', {
    p_email: normalized,
  });
  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[edgeIsAdminStaffPortalEmail] RPC fallback failed:', error.message);
    }
    return false;
  }
  return data === true || data === 't' || data === 'true';
}

/** Guest monitoring access code (replaces anon DEFINER RPC). */
export async function edgeResolveMonitoringAccessCode(p_code: string): Promise<unknown> {
  const res = await fetch(`${edgeFunctionsOrigin()}/resolve-monitoring-access-code`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({ p_code: p_code.trim() }),
  });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Edge resolve failed');
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json();
}

/** Supplier rows for price compare / pickup copy (replaces anon DEFINER RPC). */
export async function edgeGetSuppliersForPriceCompare(
  p_supplier_ids: string[]
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${edgeFunctionsOrigin()}/public-suppliers-for-price-compare`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({ p_supplier_ids }),
  });
  if (!res.ok) return [];
  try {
    const j = await res.json();
    return Array.isArray(j) ? (j as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}
