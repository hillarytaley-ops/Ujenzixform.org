/**
 * Smoke-test for the eTIMS / VFD integrator via Edge `etims-proxy`.
 * Requires Edge secrets ETIMS_BASE_URL, ETIMS_BASIC_USER, ETIMS_BASIC_PASSWORD.
 */

import React, { useMemo, useState } from "react";
import { Loader2, Landmark, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type NameCodeRow = { name: string; code: string; description?: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asNameCodeRows(data: unknown): NameCodeRow[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const rows: NameCodeRow[] = [];
  for (const item of data) {
    if (!isRecord(item)) return null;
    const name = item.name;
    const code = item.code;
    if (typeof name !== "string" || typeof code !== "string") return null;
    const description = item.description;
    rows.push({
      name: name.trim(),
      code: code.trim(),
      description: typeof description === "string" ? description.trim() : undefined,
    });
  }
  return rows;
}

function extractIntegratorPayload(root: unknown): {
  httpStatus: number | null;
  statusCode: string | null;
  message: string | null;
  rows: NameCodeRow[] | null;
  raw: unknown;
} {
  if (!isRecord(root)) {
    return { httpStatus: null, statusCode: null, message: null, rows: null, raw: root };
  }
  const httpStatus = typeof root.status === "number" ? root.status : null;
  const statusCode = typeof root.statusCode === "string" ? root.statusCode : null;
  const message = typeof root.message === "string" ? root.message : null;
  const rows = asNameCodeRows(root.data);
  return { httpStatus, statusCode, message, rows, raw: root };
}

export const EtimsTestPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<unknown>(null);
  const secretsUrl = secretsDashboardUrl();

  const parsed = useMemo(() => extractIntegratorPayload(lastPayload), [lastPayload]);
  const innerData = isRecord(lastPayload) ? lastPayload.data : undefined;
  const emptyList =
    parsed.httpStatus === 200 && Array.isArray(innerData) && innerData.length === 0;
  const showTable =
    parsed.httpStatus === 200 &&
    parsed.rows !== null &&
    parsed.rows.length > 0;
  const hasDescriptionCol = showTable && parsed.rows!.some((r) => r.description);

  const run = async (label: string, path: string) => {
    setLoading(true);
    setLastLabel(label);
    setLastPayload(null);
    try {
      const res = await invokeEtimsProxy({ method: "GET", path });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "eTIMS proxy failed",
          description: `${res.status}: ${res.message}`,
        });
        setLastPayload({ status: res.status, message: res.message, data: res.data });
        return;
      }
      toast({ title: "OK", description: `${label} loaded successfully.` });
      setLastPayload(res.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Request error", description: msg });
      setLastPayload({ error: msg });
    } finally {
      setLoading(false);
    }
  };

  const rawJson = lastPayload !== null ? JSON.stringify(lastPayload, null, 2) : "";

  return (
    <div className="space-y-4">
      <Alert className="border-border bg-muted/40 dark:bg-slate-950/60 dark:border-slate-700">
        <Landmark className="h-4 w-4" />
        <AlertTitle className="text-foreground">Integrator connection test</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Uses Edge <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">etims-proxy</code> (signed-in
          supplier or admin). Set credentials in Supabase
          {secretsUrl ? (
            <>
              {" "}
              (<a href={secretsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
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
          Load currencies
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => run("Countries", "countries")}>
          {loading && lastLabel === "Countries" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Load countries
        </Button>
      </div>

      {lastPayload !== null && (
        <div className="space-y-3">
          {lastLabel && (
            <p className="text-sm font-medium text-foreground">
              Last: <span className="text-muted-foreground">{lastLabel}</span>
            </p>
          )}

          {showTable ? (
            <div className="rounded-md border border-border bg-card">
              {(parsed.message || parsed.statusCode) && (
                <p className="border-b border-border px-3 py-2 text-sm text-muted-foreground">
                  {parsed.message}
                  {parsed.statusCode ? (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                      {parsed.statusCode}
                    </span>
                  ) : null}
                </p>
              )}
              <div className="max-h-[min(24rem,55vh)] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      {hasDescriptionCol ? <TableHead>Description</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows!.map((row, i) => (
                      <TableRow key={`${row.code}-${i}`}>
                        <TableCell className="font-mono text-sm">{row.code}</TableCell>
                        <TableCell className="text-sm">{row.name}</TableCell>
                        {hasDescriptionCol ? (
                          <TableCell className="text-sm text-muted-foreground">
                            {row.description ?? "—"}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                {parsed.rows!.length} row{parsed.rows!.length === 1 ? "" : "s"}
              </p>
            </div>
          ) : emptyList ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              {parsed.message ?? "Request succeeded"} — no rows in this list.
            </div>
          ) : (
            <Alert variant={parsed.httpStatus !== null && parsed.httpStatus >= 400 ? "destructive" : "default"}>
              <AlertTitle className="text-foreground">Response</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {isRecord(lastPayload) && typeof lastPayload.message === "string"
                  ? lastPayload.message
                  : "Could not show as a table (unexpected shape). See raw JSON below."}
              </AlertDescription>
            </Alert>
          )}

          <details className="rounded-md border border-border bg-muted/30 text-sm">
            <summary className="cursor-pointer select-none px-3 py-2 font-medium text-foreground hover:bg-muted/50">
              Raw JSON (technical)
            </summary>
            <pre className="max-h-64 overflow-auto border-t border-border p-3 text-xs text-foreground">{rawJson}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default EtimsTestPanel;
