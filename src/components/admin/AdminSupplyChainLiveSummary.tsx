import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, FileCheck2, FileText, RefreshCw, AlertCircle, FileDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { openDeliveryNotePdfWindow } from "@/utils/deliveryNoteDocument";
import { openGrnPrintWindow } from "@/utils/grnDocument";
import { openInvoicePrintWindow } from "@/utils/invoiceDocument";

type DnRow = Record<string, unknown> & { id: string; created_at: string };

type GrnRow = {
  id: string;
  created_at: string;
  grn_number: string;
  status: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  items?: unknown;
  total_quantity?: number;
  received_date?: string;
  purchase_order?: { po_number?: string; items?: unknown[] };
};

type InvRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  invoice_number: string;
  status: string;
  total_amount: number;
};

type DnAux = {
  poById: Record<string, { po_number?: string; items?: unknown }>;
  supById: Record<string, string>;
  builderLabelByKey: Record<string, string>;
};

const RECENT_LIMIT = 8;

async function downloadStorageObject(bucket: string, storagePath: string, fallbackFilename: string) {
  const trimmed = storagePath.trim();
  const { data, error } = await supabase.storage.from(bucket).download(trimmed);
  if (error) throw error;
  if (!data) throw new Error("Empty file");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  const leaf = trimmed.split("/").pop() || fallbackFilename;
  a.download = leaf.includes(".") ? leaf : `${leaf}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminSupplyChainLiveSummary() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnCount, setDnCount] = useState<number | null>(null);
  const [grnCount, setGrnCount] = useState<number | null>(null);
  const [invCount, setInvCount] = useState<number | null>(null);
  const [recentDn, setRecentDn] = useState<DnRow[]>([]);
  const [recentGrn, setRecentGrn] = useState<GrnRow[]>([]);
  const [recentInv, setRecentInv] = useState<InvRow[]>([]);
  const [dnAux, setDnAux] = useState<DnAux>({ poById: {}, supById: {}, builderLabelByKey: {} });

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
          .select("*")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase.from("goods_received_notes").select("id", { count: "exact", head: true }),
        supabase
          .from("goods_received_notes")
          .select(
            `
          id,
          created_at,
          grn_number,
          status,
          supplier_id,
          items,
          total_quantity,
          received_date,
          purchase_order:purchase_orders(po_number, items)
        `
          )
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase
          .from("invoices")
          .select(
            "id, created_at, invoice_number, status, total_amount, custom_invoice_path, items, subtotal, tax_amount, due_date, notes, payment_terms"
          )
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

      const dnRows = (dnList.data as DnRow[]) || [];
      const poIds = [...new Set(dnRows.map((r) => r.purchase_order_id).filter(Boolean))] as string[];
      const supIds = [...new Set(dnRows.map((r) => r.supplier_id).filter(Boolean))] as string[];
      const builderKeys = [...new Set(dnRows.map((r) => r.builder_id).filter(Boolean))] as string[];

      const poById: DnAux["poById"] = {};
      const supById: DnAux["supById"] = {};
      const builderLabelByKey: DnAux["builderLabelByKey"] = {};

      if (poIds.length) {
        const { data: pos, error: poErr } = await supabase
          .from("purchase_orders")
          .select("id, po_number, items")
          .in("id", poIds);
        if (poErr && !errs.length) setError(poErr.message);
        for (const p of pos || []) poById[p.id] = { po_number: p.po_number ?? undefined, items: p.items };
      }
      if (supIds.length) {
        const { data: sups, error: supErr } = await supabase
          .from("suppliers")
          .select("id, company_name")
          .in("id", supIds);
        if (supErr && !errs.length) setError(supErr.message);
        for (const s of sups || []) supById[s.id] = s.company_name || "";
      }
      if (builderKeys.length) {
        const { data: profByUser, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, id, full_name, company_name")
          .in("user_id", builderKeys);
        if (profErr && !errs.length) setError(profErr.message);
        for (const p of profByUser || []) {
          const label = (p.full_name || p.company_name || "").trim();
          if (p.user_id) builderLabelByKey[p.user_id] = label;
        }
        const missing = builderKeys.filter((k) => !builderLabelByKey[k]);
        if (missing.length) {
          const { data: profById } = await supabase
            .from("profiles")
            .select("id, full_name, company_name")
            .in("id", missing);
          for (const p of profById || []) {
            builderLabelByKey[p.id] = (p.full_name || p.company_name || "").trim();
          }
        }
      }

      setDnAux({ poById, supById, builderLabelByKey });

      const rawGrn = (grnListRaw.data as GrnRow[]) || [];
      const grnSupIds = [...new Set(rawGrn.map((g) => g.supplier_id).filter(Boolean))] as string[];
      let grnSupById: Record<string, string> = { ...supById };
      const extraGrnSids = grnSupIds.filter((id) => grnSupById[id] == null || grnSupById[id] === "");
      if (extraGrnSids.length) {
        const { data: grnSups, error: gse } = await supabase
          .from("suppliers")
          .select("id, company_name")
          .in("id", extraGrnSids);
        if (gse && !errs.length) setError(gse.message);
        for (const s of grnSups || []) grnSupById[s.id] = s.company_name || "";
      }

      const grnList: GrnRow[] = rawGrn.map((g) => ({
        ...g,
        supplier_name: (g.supplier_id ? grnSupById[g.supplier_id] : null) || g.supplier_name || null,
      }));

      setDnCount(dnHead.count ?? null);
      setRecentDn(dnRows);
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

  const handleDnDocument = async (row: DnRow) => {
    const path = typeof row.file_path === "string" ? row.file_path.trim() : "";
    const poId = row.purchase_order_id != null ? String(row.purchase_order_id) : "";
    const supId = row.supplier_id != null ? String(row.supplier_id) : "";
    const builderKey = row.builder_id != null ? String(row.builder_id) : "";
    const po = poId ? dnAux.poById[poId] : undefined;
    const ctx = {
      poNumber: po?.po_number,
      supplierName: supId ? dnAux.supById[supId] : undefined,
      builderDisplayName: builderKey ? dnAux.builderLabelByKey[builderKey] : undefined,
      purchaseOrderItems: po?.items,
    };
    try {
      if (path) {
        const label =
          (row.dn_number as string | undefined) ||
          (row.delivery_note_number as string | undefined) ||
          row.id.slice(0, 8);
        await downloadStorageObject("delivery-notes", path, `DN_${label}`);
        toast({ title: "Download started", description: "Delivery note file from storage." });
        return;
      }
      const ok = openDeliveryNotePdfWindow(row, ctx, {
        onPopUpBlocked: () =>
          toast({
            title: "Pop-up blocked",
            description: "Allow pop-ups to open the printable delivery note (includes signature when present).",
            variant: "destructive",
          }),
      });
      if (ok) {
        toast({
          title: "Delivery note opened",
          description: "Use Print → Save as PDF. The builder signature appears when it is stored on the record.",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not open delivery note",
        description: err instanceof Error ? err.message : "Try again or check storage permissions.",
        variant: "destructive",
      });
    }
  };

  const handleGrnDocument = (row: GrnRow) => {
    const rd = row.received_date || row.created_at;
    const ok = openGrnPrintWindow(
      {
        grn_number: row.grn_number,
        purchase_order: row.purchase_order,
        items: row.items,
        total_quantity: row.total_quantity,
        received_date: rd,
        status: row.status,
      },
      {
        onPopUpBlocked: () =>
          toast({
            title: "Pop-up blocked",
            description: "Allow pop-ups to print or save the GRN as PDF.",
            variant: "destructive",
          }),
      }
    );
    if (ok) {
      toast({ title: "GRN opened", description: "Use Print → Save as PDF." });
    }
  };

  const handleInvoiceDocument = async (row: InvRow) => {
    const path = typeof row.custom_invoice_path === "string" ? row.custom_invoice_path.trim() : "";
    try {
      if (path) {
        await downloadStorageObject("invoices", path, `Invoice_${row.invoice_number}`);
        toast({ title: "Download started", description: "Invoice file from storage." });
        return;
      }
      const ok = openInvoicePrintWindow(row, {
        onPopUpBlocked: () =>
          toast({
            title: "Pop-up blocked",
            description: "Allow pop-ups to print or save the invoice as PDF.",
            variant: "destructive",
          }),
      });
      if (ok) {
        toast({ title: "Invoice opened", description: "Use Print → Save as PDF (generated from line items)." });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not open invoice",
        description: err instanceof Error ? err.message : "Check storage policies for the invoices bucket.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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

      <Tabs defaultValue="grns" className="w-full">
        <TabsList className="grid w-full h-auto grid-cols-3 gap-1 rounded-lg bg-slate-800/90 p-1.5 text-gray-300 md:w-auto md:inline-flex md:max-w-xl">
          <TabsTrigger
            value="dns"
            className="rounded-md px-2 py-2.5 text-xs font-medium data-[state=active]:bg-slate-700 data-[state=active]:text-white sm:text-sm"
          >
            <span className="hidden sm:inline">Delivery notes </span>
            <span className="sm:hidden">DN </span>
            <span className="text-gray-400 tabular-nums">({loading ? "—" : recentDn.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="grns"
            className="rounded-md px-2 py-2.5 text-xs font-medium data-[state=active]:bg-slate-700 data-[state=active]:text-white sm:text-sm"
          >
            GRNs <span className="text-gray-400 tabular-nums">({loading ? "—" : recentGrn.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="invs"
            className="rounded-md px-2 py-2.5 text-xs font-medium data-[state=active]:bg-slate-700 data-[state=active]:text-white sm:text-sm"
          >
            <span className="hidden sm:inline">Invoices </span>
            <span className="sm:hidden">Inv. </span>
            <span className="text-gray-400 tabular-nums">({loading ? "—" : recentInv.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dns" className="mt-4 outline-none focus-visible:ring-0">
          <RecentTable
            title="Recent delivery notes"
            loading={loading}
            empty={!recentDn.length}
            headers={["DN #", "PO", "Status", "When", "PDF"]}
            rows={recentDn.map((r) => {
              const dn =
                (r.dn_number as string | undefined) ||
                (r.delivery_note_number as string | undefined) ||
                r.id.slice(0, 8);
              const po = r.purchase_order_id;
              const st = (r.status as string | undefined) || "—";
              return [dn, po ? String(po).slice(0, 8) + "…" : "—", st, fmtDate(r.created_at)];
            })}
            statusCol={2}
            actionsColumn={recentDn.map((r) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-cyan-300 hover:text-cyan-100"
                onClick={() => void handleDnDocument(r)}
                title="Download stored file or open printable note with signature"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            ))}
          />
        </TabsContent>

        <TabsContent value="grns" className="mt-4 outline-none focus-visible:ring-0">
          <RecentTable
            title="Recent GRNs"
            loading={loading}
            empty={!recentGrn.length}
            headers={["GRN #", "Supplier", "Status", "When", "PDF"]}
            rows={recentGrn.map((r) => [
              r.grn_number,
              r.supplier_name || "—",
              r.status,
              fmtDate(r.created_at),
            ])}
            statusCol={2}
            actionsColumn={recentGrn.map((r) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-cyan-300 hover:text-cyan-100"
                onClick={() => handleGrnDocument(r)}
                title="Open printable GRN (Save as PDF from browser)"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            ))}
          />
        </TabsContent>

        <TabsContent value="invs" className="mt-4 outline-none focus-visible:ring-0">
          <RecentTable
            title="Recent invoices"
            loading={loading}
            empty={!recentInv.length}
            headers={["Invoice #", "Amount", "Status", "When", "PDF"]}
            rows={recentInv.map((r) => [
              r.invoice_number,
              `Ksh ${Number(r.total_amount).toLocaleString()}`,
              r.status,
              fmtDate(r.created_at),
            ])}
            statusCol={2}
            actionsColumn={recentInv.map((r) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-cyan-300 hover:text-cyan-100"
                onClick={() => void handleInvoiceDocument(r)}
                title="Download uploaded invoice or open printable summary"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            ))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecentTable(props: {
  title: string;
  loading: boolean;
  empty: boolean;
  headers: string[];
  rows: (string | number)[][];
  statusCol?: number;
  actionsColumn?: ReactNode[];
}) {
  const { title, loading, empty, headers, rows, statusCol, actionsColumn } = props;
  return (
    <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
      <CardHeader className="border-b border-slate-800 py-3">
        <CardTitle className="text-base font-medium text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : empty ? (
          <p className="p-4 text-sm text-gray-500">No rows yet.</p>
        ) : (
          <div className="max-h-[min(60vh,560px)] overflow-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-slate-800 bg-slate-900/98 text-xs font-medium uppercase tracking-wide text-gray-400">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {rows.map((cells, i) => (
                  <tr key={i} className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/35">
                    {cells.map((c, j) => (
                      <td key={j} className="max-w-[14rem] px-4 py-2.5 align-middle">
                        {statusCol === j ? (
                          <Badge variant="secondary" className="max-w-full truncate text-xs font-normal">
                            {String(c)}
                          </Badge>
                        ) : (
                          <span className="break-words">{c}</span>
                        )}
                      </td>
                    ))}
                    {actionsColumn && (
                      <td className="w-14 whitespace-nowrap px-2 py-2 align-middle">{actionsColumn[i]}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
