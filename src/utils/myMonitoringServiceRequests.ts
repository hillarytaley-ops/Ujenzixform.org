import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches this project's Supabase auth storage key in `integrations/supabase/client`. */
const SB_AUTH_STORAGE = "sb-wuuyjjpgzgeimiptuuws-auth-token";

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
    try {
      const raw = localStorage.getItem(SB_AUTH_STORAGE);
      if (raw) accessToken = JSON.parse(raw).access_token || "";
    } catch {
      /* noop */
    }
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
 * That wrapper has been implicated in hung/empty responses while plain fetch works (e.g. purchase_orders counts).
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

  if (userId) {
    try {
      const res = await run(
        `${supabaseUrl}/rest/v1/monitoring_service_requests?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) collected.push(...json);
      } else {
        const txt = await res.text().catch(() => "");
        console.warn("[monitoring] REST user_id filter:", res.status, txt.slice(0, 280));
      }
    } catch (e) {
      console.warn("[monitoring] REST user_id filter error:", e);
    }
  }

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
    } else {
      const txt = await res.text().catch(() => "");
      console.warn("[monitoring] REST RPC:", res.status, txt.slice(0, 280));
    }
  } catch (e) {
    console.warn("[monitoring] REST RPC error:", e);
  }

  return mergeById(collected);
}

/** Prefer SECURITY DEFINER RPC + direct REST (bypasses supabase-js global fetch). Legacy rows: RPC branch. */
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
    console.warn(
      "[monitoring] supabase.rpc get_my_monitoring_service_requests:",
      rpc.error.message
    );
  }
  if (!rpc.error && Array.isArray(rpc.data) && rpc.data.length > 0) {
    return { rows: rpc.data as any[], usedRpc: true };
  }

  const { data, error } = await client
    .from("monitoring_service_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[monitoring] supabase.from monitoring_service_requests:", error.message);
    return { rows: [], usedRpc: false, rpcError: rpc.error?.message };
  }
  return {
    rows: Array.isArray(data) ? data : [],
    usedRpc: false,
    rpcError: rpc.error?.message,
  };
}
