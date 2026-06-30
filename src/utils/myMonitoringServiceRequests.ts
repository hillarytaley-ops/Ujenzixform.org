import { readAccessTokenSyncBestEffort } from '@/utils/supabaseAccessToken';
import { MONITORING_SERVICE_REQUEST_COLUMNS } from '@/lib/restColumnSets';
import type { SupabaseClient } from "@supabase/supabase-js";

export type MyMonitoringFetchOpts = {
  supabaseUrl: string;
  anonKey: string;
  /** Session JWT; without it PostgREST sees no auth.uid() and RLS/RPC return nothing */
  accessToken: string;
  /** Strongly recommended — REST filter matches the pattern used by supplier quote counts */
  userId?: string;
};

/** Build opts from localStorage session (and optional JWT override from getSession). */
export function monitoringRestOpts(
  supabaseUrl: string,
  anonKey: string,
  userId: string | undefined,
  accessTokenOverride?: string
): MyMonitoringFetchOpts {
  let accessToken = accessTokenOverride?.trim() || "";
  if (!accessToken) {
    accessToken = readAccessTokenSyncBestEffort();
  }
  return {
    supabaseUrl,
    anonKey,
    accessToken: accessToken || anonKey,
    userId,
  };
}

function mergeById(rows: any[]): any[] {
  const m = new Map<string, any>();
  for (const r of rows) {
    if (r?.id) m.set(String(r.id), r);
  }
  return [...m.values()].sort(
    (a, b) =>
      new Date(String(b.created_at || 0)).getTime() -
      new Date(String(a.created_at || 0)).getTime()
  );
}

/**
 * Load monitoring rows without supabase-js global fetch (15s AbortController on every call).
 */
async function loadViaDirectRest(opts: MyMonitoringFetchOpts): Promise<any[]> {
  const { supabaseUrl, anonKey, accessToken, userId } = opts;
  const auth = accessToken || anonKey;
  const baseHeaders: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${auth}`,
    Accept: "application/json",
  };

  const run = async (url: string, init?: RequestInit) => {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 25000);
    try {
      return await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: { ...baseHeaders, ...(init?.headers as Record<string, string>) },
      });
    } finally {
      window.clearTimeout(t);
    }
  };

  const collected: any[] = [];

  // Prefer RPC first (scoped, no invalid column lists)
  try {
    const res = await run(`${supabaseUrl}/rest/v1/rpc/get_my_monitoring_service_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: "{}",
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) collected.push(...json);
    }
  } catch {
    /* fall through */
  }

  if (userId && collected.length === 0) {
    try {
      const res = await run(
        `${supabaseUrl}/rest/v1/monitoring_service_requests?user_id=eq.${encodeURIComponent(userId)}&select=${MONITORING_SERVICE_REQUEST_COLUMNS}&order=created_at.desc`
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) collected.push(...json);
      }
    } catch {
      /* ignore */
    }
  }

  return mergeById(collected);
}

/** Prefer SECURITY DEFINER RPC + direct REST (bypasses supabase-js global fetch). */
export async function fetchMyMonitoringServiceRequests(
  client: SupabaseClient,
  opts?: MyMonitoringFetchOpts
): Promise<{ rows: any[]; usedRpc: boolean; rpcError?: string }> {
  if (opts?.supabaseUrl && opts.anonKey && opts.accessToken) {
    const direct = await loadViaDirectRest(opts);
    if (direct.length > 0) {
      return { rows: direct, usedRpc: true };
    }
  }

  const rpc = await client.rpc("get_my_monitoring_service_requests");
  if (rpc.error) {
    if (import.meta.env.DEV) {
      console.warn(
        "[monitoring] supabase.rpc get_my_monitoring_service_requests:",
        rpc.error.message
      );
    }
  }
  if (!rpc.error && Array.isArray(rpc.data) && rpc.data.length > 0) {
    return { rows: rpc.data as any[], usedRpc: true };
  }

  const { data, error } = await client
    .from("monitoring_service_requests")
    .select(MONITORING_SERVICE_REQUEST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) {
      console.warn("[monitoring] supabase.from monitoring_service_requests:", error.message);
    }
    return { rows: [], usedRpc: false, rpcError: rpc.error?.message };
  }
  return {
    rows: Array.isArray(data) ? data : [],
    usedRpc: false,
    rpcError: rpc.error?.message,
  };
}
