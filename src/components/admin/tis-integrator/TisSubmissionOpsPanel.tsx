/**
 * Cross-vendor eTIMS submission operations — PO invoices, errors, audit log.
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  submitEtimsCreditNoteForPurchaseOrder,
  submitEtimsInvoiceForPurchaseOrder,
} from "@/lib/etims/purchaseOrderEtims";
import { logTisSubmission } from "@/lib/etims/logTisSubmission";

type PoRow = {
  id: string;
  po_number: string;
  supplier_id: string | null;
  total_amount: number;
  created_at: string;
  etims_submitted_at: string | null;
  etims_trader_invoice_no: string | null;
  etims_error: string | null;
  etims_verification_url: string | null;
  etims_credit_submitted_at: string | null;
  etims_credit_error: string | null;
  supplier_name: string | null;
};

function formatDbError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  if (typeof e === "object" && e !== null && "details" in e && typeof (e as { details: unknown }).details === "string") {
    return (e as { details: string }).details;
  }
  return "Unknown database error";
}

type LogRow = {
  id: string;
  submission_type: string;
  status: string;
  trader_invoice_no: string | null;
  error_message: string | null;
  created_at: string;
};

type FilterStatus = "all" | "pending" | "success" | "failed";

export const TisSubmissionOpsPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<PoRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const poRes = await supabase
        .from("purchase_orders")
        .select(
          "id,po_number,supplier_id,total_amount,created_at,etims_submitted_at,etims_trader_invoice_no,etims_error,etims_verification_url,etims_credit_submitted_at,etims_credit_error",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (poRes.error) throw poRes.error;

      const rawPos = (poRes.data ?? []) as Omit<PoRow, "supplier_name">[];
      const supplierIds = [...new Set(rawPos.map((p) => p.supplier_id).filter(Boolean))] as string[];

      const supplierNameById = new Map<string, string>();
      if (supplierIds.length > 0) {
        const { data: suppliers, error: supErr } = await supabase
          .from("suppliers")
          .select("id,company_name,legal_business_name")
          .in("id", supplierIds);
        if (supErr) {
          console.warn("TIS submission ops: could not load supplier names", supErr.message);
        } else {
          for (const s of suppliers ?? []) {
            const name =
              (s as { company_name?: string | null; legal_business_name?: string | null }).company_name ||
              (s as { legal_business_name?: string | null }).legal_business_name ||
              "";
            if (name) supplierNameById.set((s as { id: string }).id, name);
          }
        }
      }

      setPos(
        rawPos.map((po) => ({
          ...po,
          supplier_name: po.supplier_id ? supplierNameById.get(po.supplier_id) ?? null : null,
        })),
      );

      const logRes = await supabase
        .from("tis_submission_log")
        .select("id,submission_type,status,trader_invoice_no,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      setLogs((logRes.error ? [] : logRes.data ?? []) as LogRow[]);
    } catch (e: unknown) {
      toast({
        title: "Could not load submissions",
        description: formatDbError(e),
        variant: "destructive",
      });
      setPos([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const poStatus = (po: PoRow): FilterStatus => {
    if (po.etims_error) return "failed";
    if (po.etims_submitted_at) return "success";
    return "pending";
  };

  const q = filter.trim().toLowerCase();
  const filtered = pos.filter((po) => {
    if (statusFilter !== "all" && poStatus(po) !== statusFilter) return false;
    if (!q) return true;
    const vendor = (po.supplier_name ?? "").toLowerCase();
    return po.po_number.toLowerCase().includes(q) || vendor.includes(q) || po.id.toLowerCase().includes(q);
  });

  const stats = {
    pending: pos.filter((p) => poStatus(p) === "pending").length,
    success: pos.filter((p) => poStatus(p) === "success").length,
    failed: pos.filter((p) => poStatus(p) === "failed").length,
  };

  const retrySale = async (poId: string) => {
    setRetryingId(poId);
    try {
      const result = await submitEtimsInvoiceForPurchaseOrder(poId);
      if (!result.ok) {
        await logTisSubmission({
          purchaseOrderId: poId,
          submissionType: "sale",
          status: "failed",
          errorMessage: result.message,
        });
        toast({ title: "Retry failed", description: result.message, variant: "destructive" });
        return;
      }
      await logTisSubmission({
        purchaseOrderId: poId,
        submissionType: "sale",
        status: "success",
        responseSnapshot: result.data,
      });
      toast({ title: "Invoice submitted", description: poId });
      void load();
    } finally {
      setRetryingId(null);
    }
  };

  const submitCredit = async (poId: string) => {
    setRetryingId(`credit-${poId}`);
    try {
      const result = await submitEtimsCreditNoteForPurchaseOrder(poId);
      if (!result.ok) {
        await logTisSubmission({
          purchaseOrderId: poId,
          submissionType: "credit_note",
          status: "failed",
          errorMessage: result.message,
        });
        toast({ title: "Credit note failed", description: result.message, variant: "destructive" });
        return;
      }
      await logTisSubmission({
        purchaseOrderId: poId,
        submissionType: "credit_note",
        status: "success",
        responseSnapshot: result.data,
      });
      toast({ title: "Credit note submitted" });
      void load();
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900/40">
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-semibold text-white">{stats.pending}</p>
              <p className="text-xs text-gray-400">Pending submission</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/40">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-semibold text-white">{stats.success}</p>
              <p className="text-xs text-gray-400">Submitted to KRA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/40">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-semibold text-white">{stats.failed}</p>
              <p className="text-xs text-gray-400">Failed / error</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-900/40">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base text-white">Purchase order submissions</CardTitle>
              <CardDescription className="text-gray-400">
                Monitor and retry eTIMS sales invoices and credit notes across all vendor clients.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search PO number or vendor…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm bg-slate-950/60"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-[180px] bg-slate-950/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="success">Submitted</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="max-h-[min(20rem,45vh)] overflow-auto rounded-md border border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-gray-300">PO</TableHead>
                    <TableHead className="text-gray-300">Vendor</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Invoice no</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        {pos.length === 0
                          ? "No purchase orders in the system yet."
                          : "No purchase orders match filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((po) => {
                      const st = poStatus(po);
                      return (
                        <TableRow key={po.id} className="border-slate-800">
                          <TableCell className="font-mono text-xs text-white">{po.po_number}</TableCell>
                          <TableCell className="text-sm text-gray-300">
                            {po.supplier_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-300">
                            KES {Number(po.total_amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {st === "success" ? (
                              <Badge className="bg-emerald-700/80">Submitted</Badge>
                            ) : st === "failed" ? (
                              <Badge variant="destructive" title={po.etims_error ?? undefined}>
                                Failed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[8rem] truncate text-xs font-mono text-gray-400">
                            {po.etims_trader_invoice_no ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(st === "pending" || st === "failed") && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={retryingId === po.id}
                                  onClick={() => void retrySale(po.id)}
                                  title="Submit / retry sale invoice"
                                >
                                  {retryingId === po.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {st === "success" && !po.etims_credit_submitted_at && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={retryingId === `credit-${po.id}`}
                                  onClick={() => void submitCredit(po.id)}
                                  title="Submit credit note"
                                >
                                  CN
                                </Button>
                              )}
                            </div>
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

      {logs.length > 0 && (
        <Card className="border-slate-700 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-base text-white">Recent audit log</CardTitle>
            <CardDescription className="text-gray-400">Integrator submission events (last 50).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-auto rounded-md border border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-slate-800">
                      <TableCell className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">{log.submission_type}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-400">
                        {log.trader_invoice_no ?? log.error_message?.slice(0, 40) ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TisSubmissionOpsPanel;
