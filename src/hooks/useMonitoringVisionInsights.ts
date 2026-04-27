import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VisionInsightCategory =
  | "security"
  | "workforce"
  | "operations"
  | "safety"
  | "usage"
  | "other";

export type VisionSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface MonitoringVisionInsightRow {
  id: string;
  user_id: string;
  monitoring_request_id: string | null;
  project_id: string | null;
  camera_id: string | null;
  camera_label: string | null;
  insight_category: VisionInsightCategory;
  severity: VisionSeverity;
  headline: string;
  detail: string | null;
  metrics: Record<string, unknown> | null;
  source_stream_id: string | null;
  created_at: string;
}

function isUuid(id: string | null | undefined): id is string {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

interface UseMonitoringVisionInsightsOptions {
  userId: string | null | undefined;
  userRole?: string | null;
  projectId?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useMonitoringVisionInsights({
  userId,
  userRole,
  projectId,
  limit = 40,
  enabled = true,
}: UseMonitoringVisionInsightsOptions) {
  const [rows, setRows] = useState<MonitoringVisionInsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const isAdmin = userRole === "admin";
  const validUserId = isUuid(userId ?? undefined);

  const fetchRows = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!isAdmin && !validUserId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let q = supabase
        .from("monitoring_vision_insights")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!isAdmin && validUserId) {
        q = q.eq("user_id", userId as string);
      }
      if (projectId) {
        q = q.eq("project_id", projectId);
      }

      const { data, error: e } = await q;
      if (e) {
        const msg = e.message || "";
        if (e.code === "42P01" || msg.includes("does not exist")) {
          setRows([]);
          setError(null);
        } else {
          setError(msg);
          setRows([]);
        }
      } else {
        setRows((data || []) as MonitoringVisionInsightRow[]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, isAdmin, validUserId, userId, projectId, limit]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!enabled) return;
    if (!isAdmin && !validUserId) return;

    const channelName = `vision-insights-${isAdmin ? "admin" : userId}-${projectId || "all"}`;
    const channel = supabase.channel(channelName);

    const handler = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as MonitoringVisionInsightRow | null;
      if (!row?.id) return;
      if (projectId && row.project_id && row.project_id !== projectId) return;
      if (!isAdmin && row.user_id !== userId) return;
      setRows((prev) => {
        const next = [row, ...prev.filter((r) => r.id !== row.id)];
        return next.slice(0, limit);
      });
    };

    const config: {
      event: "INSERT";
      schema: "public";
      table: "monitoring_vision_insights";
      filter?: string;
    } = {
      event: "INSERT",
      schema: "public",
      table: "monitoring_vision_insights",
    };
    if (!isAdmin && validUserId) {
      config.filter = `user_id=eq.${userId}`;
    }

    channel.on("postgres_changes", config, handler);

    channel.subscribe((status) => {
      setLive(status === "SUBSCRIBED");
    });

    return () => {
      void supabase.removeChannel(channel);
      setLive(false);
    };
  }, [enabled, isAdmin, validUserId, userId, projectId, limit]);

  return { rows, loading, error, live, refetch: fetchRows };
}
