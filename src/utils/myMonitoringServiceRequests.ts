import type { SupabaseClient } from "@supabase/supabase-js";

/** Prefer RPC (SECURITY DEFINER) when RLS or legacy user_id/requester_id data blocks plain SELECT. */
export async function fetchMyMonitoringServiceRequests(
  client: SupabaseClient
): Promise<{ rows: any[]; usedRpc: boolean }> {
  const rpc = await client.rpc("get_my_monitoring_service_requests");
  if (!rpc.error && Array.isArray(rpc.data)) {
    return { rows: rpc.data as any[], usedRpc: true };
  }

  const { data, error } = await client
    .from("monitoring_service_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { rows: [], usedRpc: false };
  }
  return { rows: Array.isArray(data) ? data : [], usedRpc: false };
}
