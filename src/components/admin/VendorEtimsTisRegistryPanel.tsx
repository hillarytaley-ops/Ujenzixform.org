/**
 * Admin: supplier/vendor registry for KRA eTIMS Trader Invoicing System (TIS) fields.
 * Platform integrator credentials stay in Edge secrets; this panel tracks per-supplier tax identity.
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

type SupplierEtimsRow = {
  id: string;
  company_name: string | null;
  legal_business_name: string | null;
  kra_pin: string | null;
  etims_branch_code: string | null;
  etims_integrator_account_ref: string | null;
  etims_last_connection_test_at: string | null;
  is_verified: boolean | null;
};

function readiness(row: SupplierEtimsRow): "ready" | "partial" | "missing" {
  const pin = (row.kra_pin ?? "").trim();
  const branch = (row.etims_branch_code ?? "").trim();
  if (pin && branch) return "ready";
  if (pin || branch || (row.etims_integrator_account_ref ?? "").trim()) return "partial";
  return "missing";
}

export const VendorEtimsTisRegistryPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupplierEtimsRow[]>([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select(
          "id,company_name,legal_business_name,kra_pin,etims_branch_code,etims_integrator_account_ref,etims_last_connection_test_at,is_verified",
        )
        .order("company_name", { ascending: true })
        .limit(500);

      if (error) throw error;
      setRows((data ?? []) as SupplierEtimsRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Could not load suppliers", description: msg, variant: "destructive" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => {
        const name = (r.company_name ?? r.legal_business_name ?? "").toLowerCase();
        const pin = (r.kra_pin ?? "").toLowerCase();
        return name.includes(q) || pin.includes(q) || r.id.toLowerCase().includes(q);
      })
    : rows;

  const readyCount = rows.filter((r) => readiness(r) === "ready").length;

  return (
    <Card className="border-slate-700 bg-slate-900/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-white">Vendor TIS registry (suppliers)</CardTitle>
            <CardDescription className="text-gray-400">
              Each supplier is a KRA taxpayer using UjenziXform as the Trader Invoicing System (TIS). OSCU/VSCU
              credentials are configured in Supabase Edge secrets — not stored here.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search company or KRA PIN…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm bg-slate-950/60"
          />
          <p className="text-xs text-muted-foreground">
            {readyCount} of {rows.length} suppliers have PIN + branch code for eTIMS invoicing
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading supplier registry…
          </div>
        ) : (
          <div className="max-h-[min(24rem,50vh)] overflow-auto rounded-md border border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-gray-300">Supplier</TableHead>
                  <TableHead className="text-gray-300">KRA PIN</TableHead>
                  <TableHead className="text-gray-300">Branch</TableHead>
                  <TableHead className="text-gray-300">Integrator ref</TableHead>
                  <TableHead className="text-gray-300">TIS readiness</TableHead>
                  <TableHead className="text-gray-300">Last test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No suppliers match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const state = readiness(row);
                    return (
                      <TableRow key={row.id} className="border-slate-800">
                        <TableCell className="text-sm text-white">
                          {row.company_name || row.legal_business_name || row.id.slice(0, 8)}
                          {row.is_verified ? (
                            <Badge variant="outline" className="ml-2 border-emerald-600/50 text-emerald-400">
                              verified
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-300">{row.kra_pin || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-300">
                          {row.etims_branch_code || "—"}
                        </TableCell>
                        <TableCell className="max-w-[8rem] truncate text-xs text-gray-400">
                          {row.etims_integrator_account_ref || "—"}
                        </TableCell>
                        <TableCell>
                          {state === "ready" ? (
                            <Badge className="bg-emerald-700/80 hover:bg-emerald-700/80">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Ready
                            </Badge>
                          ) : state === "partial" ? (
                            <Badge variant="secondary">Partial</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-600/50 text-amber-400">
                              <XCircle className="mr-1 h-3 w-3" />
                              Missing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {row.etims_last_connection_test_at
                            ? new Date(row.etims_last_connection_test_at).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorEtimsTisRegistryPanel;
