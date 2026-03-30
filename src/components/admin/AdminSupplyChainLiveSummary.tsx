import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, FileCheck2, FileText, RefreshCw, AlertCircle } from "lucide-react";

type DnRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  purchase_order_id?: string | null;
};

type GrnRow = {
  id: string;
  created_at: string;
  grn_number: string;
  status: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
};

type InvRow = {
  id: string;
  created_at: string;
  invoice_number: string;
  status: string;
  total_amount: number;
};

const RECENT_LIMIT = 8;

export function AdminSupplyChainLiveSummary() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnCount, setDnCount] = useState<number | null>(null);
  const [grnCount, setGrnCount] = useState<number | null>(null);
  const [invCount, setInvCount] = useState<number | null>(null);
  const [recentDn, setRecentDn] = useState<DnRow[]>([]);
  const [recentGrn, setRecentGrn] = useState<GrnRow[]>([]);
  const [recentInv, setRecentInv] = useState<InvRow[]>([]);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [
        dnHead,
        dnList,
        grnHead,
        grnListRaw,
        invHead,
        invList,
      ] = await Promise.all([
        supabase.from("delivery_notes").select("id", { count: "exact", head: true }),
        supabase
          .from("delivery_notes")
          .select("id, created_at, purchase_order_id, status, dn_number, delivery_note_number")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase.from("goods_received_notes").select("id", { count: "exact", head: true }),
        supabase
          .from("goods_received_notes")
          .select("id, created_at, grn_number, status, supplier_id")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase
          .from("invoices")
          .select("id, created_at, invoice_number, status, total_amount")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
      ]);

      const errs = [dnHead.error, dnList.error, grnHead.error, grnListRaw.error, invHead.error, invList.error].filter(
        Boolean
      );
      if (errs.length) {
        const msg = errs.map((e) => e?.message).filter(Boolean).join(" · ") || "Could not load supply-chain data.";
        setError(msg);
      }

      const rawGrn = (grnListRaw.data as GrnRow[]) || [];
      const supIds = [...new Set(rawGrn.map((g) => g.supplier_id).filter(Boolean))] as string[];
      let supById: Record<string, string> = {};
      if (supIds.length) {
        const { data: sups, error: supErr } = await supabase
          .from("suppliers")
          .select("id, company_name")
          .in("id", supIds);
        if (supErr && !errs.length) setError(supErr.message);
        supById = Object.fromEntries((sups || []).map((s) => [s.id, s.company_name || ""]));
      }

      const grnList: GrnRow[] = rawGrn.map((g) => ({
        ...g,
        supplier_name: (g.supplier_id ? supById[g.supplier_id] : null) || g.supplier_name || null,
      }));

      setDnCount(dnHead.count ?? null);
      setRecentDn((dnList.data as DnRow[]) || []);
      setGrnCount(grnHead.count ?? null);
      setRecentGrn(grnList);
      setInvCount(invHead.count ?? null);
      setRecentInv((invList.data as InvRow[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("paid") || s.includes("complete") || s.includes("approved"))
      return <Badge className="bg-emerald-700 text-white text-xs">{status}</Badge>;
    if (s.includes("pending") || s.includes("draft")) return <Badge className="bg-amber-600 text-white text-xs">{status}</Badge>;
    if (s.includes("reject") || s.includes("overdue") || s.includes("cancel"))
      return <Badge variant="destructive" className="text-xs">{status}</Badge>;
    return <Badge variant="secondary" className="text-xs">{status || "—"}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">Live platform data</h3>
          <p className="text-sm text-gray-400">
            Totals and latest rows from the database (same source as builder/supplier hubs). Requires admin JWT + RLS.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || refreshing}
          className="border-slate-600 text-gray-200 hover:bg-slate-800"
          onClick={() => void load(true)}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-400" />
              Delivery notes
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">All records</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{loading ? "—" : dnCount ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-cyan-400" />
              GRNs
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">Goods received notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{loading ? "—" : grnCount ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Invoices
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">All invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{loading ? "—" : invCount ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentTable
          title="Recent delivery notes"
          loading={loading}
          empty={!recentDn.length}
          headers={["DN #", "PO", "Status", "When"]}
          rows={recentDn.map((r) => {
            const dn =
              (r.dn_number as string | undefined) ||
              (r.delivery_note_number as string | undefined) ||
              r.id.slice(0, 8);
            const po = r.purchase_order_id;
            const st = (r.status as string | undefined) || "—";
            return [
              dn,
              po ? String(po).slice(0, 8) + "…" : "—",
              st,
              fmtDate(r.created_at),
            ];
          })}
          statusCol={2}
        />
        <RecentTable
          title="Recent GRNs"
          loading={loading}
          empty={!recentGrn.length}
          headers={["GRN #", "Supplier", "Status", "When"]}
          rows={recentGrn.map((r) => [
            r.grn_number,
            r.supplier_name?.slice(0, 24) || "—",
            r.status,
            fmtDate(r.created_at),
          ])}
          statusCol={2}
        />
        <RecentTable
          title="Recent invoices"
          loading={loading}
          empty={!recentInv.length}
          headers={["Invoice #", "Amount", "Status", "When"]}
          rows={recentInv.map((r) => [
            r.invoice_number,
            `Ksh ${Number(r.total_amount).toLocaleString()}`,
            r.status,
            fmtDate(r.created_at),
          ])}
          statusCol={2}
        />
      </div>
    </div>
  );
}

function RecentTable(props: {
  title: string;
  loading: boolean;
  empty: boolean;
  headers: string[];
  rows: (string | number)[][];
  /** 0-based column index to render as Badge */
  statusCol?: number;
}) {
  const { title, loading, empty, headers, rows, statusCol } = props;
  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
      <CardHeader className="py-3 border-b border-slate-800">
        <CardTitle className="text-white text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 max-h-[280px] overflow-y-auto">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : empty ? (
          <p className="p-4 text-sm text-gray-500">No rows yet.</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-slate-900/95 text-gray-400 border-b border-slate-800">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {rows.map((cells, i) => (
                <tr key={i} className="border-b border-slate-800/80 hover:bg-slate-800/40">
                  {cells.map((c, j) => (
                    <td key={j} className="px-3 py-2 align-middle">
                      {statusCol === j ? (
                        <Badge variant="secondary" className="text-[10px] font-normal max-w-[120px] truncate">
                          {String(c)}
                        </Badge>
                      ) : (
                        <span className="break-all">{c}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
