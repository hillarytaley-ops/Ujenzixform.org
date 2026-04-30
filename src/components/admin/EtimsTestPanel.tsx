/**
 * Admin smoke-test for the eTIMS / VFD integrator via Edge `etims-proxy`.
 * Requires Edge secrets ETIMS_BASE_URL, ETIMS_BASIC_USER, ETIMS_BASIC_PASSWORD.
 */

import React, { useState } from "react";
import { Loader2, Landmark, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { invokeEtimsProxy } from "@/lib/etims/invokeEtimsProxy";

function secretsDashboardUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const host = new URL(raw.trim()).hostname;
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    const ref = m?.[1];
    return ref ? `https://supabase.com/dashboard/project/${ref}/settings/functions` : null;
  } catch {
    return null;
  }
}

export const EtimsTestPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const [lastJson, setLastJson] = useState<string | null>(null);
  const secretsUrl = secretsDashboardUrl();

  const run = async (label: string, path: string) => {
    setLoading(true);
    setLastLabel(label);
    setLastJson(null);
    try {
      const res = await invokeEtimsProxy({ method: "GET", path });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "eTIMS proxy failed",
          description: `${res.status}: ${res.message}`,
        });
        setLastJson(JSON.stringify({ status: res.status, message: res.message, data: res.data }, null, 2));
        return;
      }
      toast({ title: "OK", description: `${label} returned success.` });
      setLastJson(JSON.stringify(res.data, null, 2));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Request error", description: msg });
      setLastJson(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="border-slate-700 bg-slate-950/80">
        <Landmark className="h-4 w-4" />
        <AlertTitle className="text-slate-100">Integrator smoke test</AlertTitle>
        <AlertDescription className="text-slate-400">
          Calls Edge <code className="text-slate-300">etims-proxy</code> → your test API. Configure secrets in Supabase
          {secretsUrl ? (
            <>
              {" "}
              (<a href={secretsUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                Edge secrets
              </a>
              ).
            </>
          ) : (
            " (Edge secrets)."
          )}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => run("Currencies", "currencies")}>
          {loading && lastLabel === "Currencies" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          GET currencies
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => run("Countries", "countries")}>
          {loading && lastLabel === "Countries" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          GET countries
        </Button>
      </div>

      {lastJson && (
        <div>
          <p className="text-sm text-slate-400 mb-1">{lastLabel ? `Last: ${lastLabel}` : "Last response"}</p>
          <pre className="max-h-80 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
            {lastJson}
          </pre>
        </div>
      )}
    </div>
  );
};

export default EtimsTestPanel;
