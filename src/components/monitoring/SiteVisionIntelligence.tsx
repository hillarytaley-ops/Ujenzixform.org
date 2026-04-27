import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMonitoringVisionInsights,
  type MonitoringVisionInsightRow,
} from "@/hooks/useMonitoringVisionInsights";
import {
  Activity,
  AlertTriangle,
  Camera,
  HardHat,
  Loader2,
  Radio,
  Shield,
  Users,
  Video,
  Wrench,
} from "lucide-react";

function categoryIcon(category: MonitoringVisionInsightRow["insight_category"]) {
  switch (category) {
    case "security":
      return Shield;
    case "workforce":
      return Users;
    case "operations":
      return Wrench;
    case "safety":
      return HardHat;
    case "usage":
      return Activity;
    default:
      return Video;
  }
}

function severityVariant(
  s: MonitoringVisionInsightRow["severity"]
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "critical" || s === "high") return "destructive";
  if (s === "medium") return "default";
  return "secondary";
}

function formatAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

interface SiteVisionIntelligenceProps {
  userId: string | null | undefined;
  userRole?: string | null;
  /** When set, only insights tagged for this builder project */
  projectId?: string | null;
  compact?: boolean;
  className?: string;
}

export const SiteVisionIntelligence: React.FC<SiteVisionIntelligenceProps> = ({
  userId,
  userRole,
  projectId,
  compact = false,
  className = "",
}) => {
  const { rows, loading, error, live } = useMonitoringVisionInsights({
    userId,
    userRole,
    projectId: projectId || undefined,
    limit: compact ? 12 : 40,
    enabled: true,
  });

  const title = projectId ? "Live AI — this project" : "Live site vision intelligence";
  const description = compact
    ? "Security, crew movement, and site activity from Monitoring cameras (Realtime)."
    : "Kenya-ready pipeline: camera streams from the Monitoring page feed AI analysis here as events arrive — usage patterns, perimeter checks, and workforce movement.";

  return (
    <Card className={`border-cyan-200/80 bg-gradient-to-br from-cyan-50/40 to-white ${className}`}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-cyan-600" />
              {title}
            </CardTitle>
            <CardDescription className={compact ? "text-xs" : ""}>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={live ? "default" : "secondary"}
              className={live ? "bg-emerald-600 hover:bg-emerald-600 gap-1" : "gap-1"}
            >
              <Radio className={`h-3 w-3 ${live ? "animate-pulse" : ""}`} />
              {live ? "Live" : "Connecting…"}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to="/monitoring">Monitoring</Link>
            </Button>
            {!compact && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/analytics">ML Analytics</Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading vision events…
          </div>
        ) : error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Could not load insights.</span>{" "}
            {error.includes("permission") || error.includes("RLS")
              ? "Check that you are signed in and migrations are applied."
              : error}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 px-2 text-muted-foreground text-sm space-y-2">
            <Video className="h-10 w-10 mx-auto opacity-40" />
            <p className="font-medium text-foreground">No vision events yet</p>
            <p>
              When your Monitoring cameras are linked to the vision pipeline, security alerts, crew
              movement, and site-activity summaries will stream here in real time — same feed powers
              the ML Analytics dashboard for admins.
            </p>
            <Button variant="secondary" size="sm" asChild className="mt-2">
              <Link to="/monitoring">Open live cameras</Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[220px]" : "h-[min(420px,50vh)]"}>
            <ul className="space-y-3 pr-3">
              {rows.map((row) => {
                const Icon = categoryIcon(row.insight_category);
                return (
                  <li
                    key={row.id}
                    className="rounded-lg border bg-white/80 p-3 shadow-sm flex gap-3 items-start"
                  >
                    <div className="p-2 rounded-md bg-cyan-100 text-cyan-800 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={severityVariant(row.severity)} className="text-xs">
                          {row.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {row.insight_category}
                        </Badge>
                        {row.camera_label && (
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {row.camera_label}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {formatAgo(row.created_at)}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-foreground leading-snug">{row.headline}</p>
                      {row.detail && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{row.detail}</p>
                      )}
                      {(row.severity === "high" || row.severity === "critical") && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Review on Monitoring and confirm on site if needed.
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
