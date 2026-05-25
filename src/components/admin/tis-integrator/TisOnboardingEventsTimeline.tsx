/**
 * Vendor onboarding audit timeline.
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ONBOARDING_STATUS_LABELS } from "./types";

type EventRow = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  created_at: string;
};

export const TisOnboardingEventsTimeline: React.FC<{ supplierId: string | null }> = ({ supplierId }) => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);

  const load = useCallback(async () => {
    if (!supplierId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tis_vendor_onboarding_events")
        .select("id,event_type,from_status,to_status,message,created_at")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setEvents((data ?? []) as EventRow[]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!supplierId) return null;

  return (
    <div className="space-y-2 rounded-md border border-slate-700 bg-slate-950/40 p-3">
      <p className="text-xs font-medium text-gray-300">Onboarding audit trail</p>
      {loading ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events yet — status changes and initialization are logged here.</p>
      ) : (
        <ul className="max-h-32 space-y-1.5 overflow-auto text-xs">
          {events.map((ev) => (
            <li key={ev.id} className="border-l-2 border-indigo-600/50 pl-2 text-gray-400">
              <span className="text-gray-500">{new Date(ev.created_at).toLocaleString()} · </span>
              <span className="text-gray-300">{ev.event_type.replace(/_/g, " ")}</span>
              {ev.from_status && ev.to_status ? (
                <span>
                  {" "}
                  ({ONBOARDING_STATUS_LABELS[ev.from_status as keyof typeof ONBOARDING_STATUS_LABELS] ?? ev.from_status}{" "}
                  → {ONBOARDING_STATUS_LABELS[ev.to_status as keyof typeof ONBOARDING_STATUS_LABELS] ?? ev.to_status})
                </span>
              ) : null}
              {ev.message ? <span className="block text-muted-foreground">{ev.message}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TisOnboardingEventsTimeline;
