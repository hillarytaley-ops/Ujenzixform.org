/**
 * Beta: submit a UjenziXform purchase order to the integrator as an eTIMS/VFD invoice.
 * eTIMS lines need a KRA item code per row (JSON, catalog DB, or aliases — see purchaseOrderEtims.ts).
 */

import React, { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Package, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  isDiscouragedEtimsItemCode,
  pushEtimsItemStockLevel,
  submitEtimsInvoiceForPurchaseOrder,
} from "@/lib/etims/purchaseOrderEtims";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PoPickRow = {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
};

function formatPoDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatKesAmount(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return `KES ${x.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export type EtimsPurchaseOrderSubmitCardProps = {
  /** When set, PO must belong to this supplier row id */
  enforceSupplierId?: string | null;
  /** From integrator GET currencies; defaults to KES in builder if omitted */
  invoiceCurrency?: string | null;
  invoiceExchangeRate?: number | null;
  /** Optional; only sent if non-empty (integrator may ignore or reject) */
  invoiceCountryCode?: string | null;
};

export const EtimsPurchaseOrderSubmitCard: React.FC<EtimsPurchaseOrderSubmitCardProps> = ({
  enforceSupplierId,
  invoiceCurrency,
  invoiceExchangeRate,
  invoiceCountryCode,
}) => {
  const { toast } = useToast();
  const [poId, setPoId] = useState("");
  const [customerPin, setCustomerPin] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [stockItemCode, setStockItemCode] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockBusy, setStockBusy] = useState(false);
  /** Suggestions for stock item code (materials / supplier prices with etims_item_code set) */
  const [stockCodeSuggestions, setStockCodeSuggestions] = useState<{ code: string; label: string }[]>([]);
  const [stockCodesLoading, setStockCodesLoading] = useState(false);

  const [orders, setOrders] = useState<PoPickRow[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [poPickerOpen, setPoPickerOpen] = useState(false);

  const loadRecentOrders = async () => {
    setOrdersLoading(true);
    try {
      let q = supabase
        .from("purchase_orders")
        .select("id, po_number, status, total_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(75);
      if (enforceSupplierId?.trim()) {
        q = q.eq("supplier_id", enforceSupplierId.trim());
      }
      const { data, error } = await q;
      if (error) {
        toast({ variant: "destructive", title: "Could not load orders", description: error.message });
        setOrders([]);
        return;
      }
      setOrders((data ?? []) as PoPickRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Could not load orders", description: msg });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadStockItemCodeSuggestions = async () => {
    setStockCodesLoading(true);
    try {
      const byCode = new Map<string, string>();
      let matQ = supabase
        .from("materials")
        .select("etims_item_code, name")
        .not("etims_item_code", "is", null)
        .limit(200);
      const sid = enforceSupplierId?.trim();
      if (sid) matQ = matQ.eq("supplier_id", sid);
      const { data: mats, error: matErr } = await matQ;
      if (matErr) throw matErr;
      for (const row of mats ?? []) {
        const code = typeof (row as { etims_item_code?: string | null }).etims_item_code === "string"
          ? (row as { etims_item_code: string }).etims_item_code.trim()
          : "";
        if (!code || isDiscouragedEtimsItemCode(code)) continue;
        const name = typeof (row as { name?: string | null }).name === "string" ? (row as { name: string }).name.trim() : "";
        if (!byCode.has(code)) byCode.set(code, name || code);
      }
      if (sid) {
        const { data: prices, error: priceErr } = await supabase
          .from("supplier_product_prices")
          .select("etims_item_code")
          .eq("supplier_id", sid)
          .not("etims_item_code", "is", null)
          .limit(200);
        if (!priceErr) {
          for (const row of prices ?? []) {
            const code =
              typeof (row as { etims_item_code?: string | null }).etims_item_code === "string"
                ? (row as { etims_item_code: string }).etims_item_code.trim()
                : "";
            if (code && !isDiscouragedEtimsItemCode(code) && !byCode.has(code)) byCode.set(code, code);
          }
        }
      }
      setStockCodeSuggestions(
        [...byCode.entries()].map(([code, label]) => ({
          code,
          label: label === code ? code : `${label} (${code})`,
        }))
      );
    } catch (e) {
      console.warn("eTIMS stock code suggestions:", e);
      setStockCodeSuggestions([]);
    } finally {
      setStockCodesLoading(false);
    }
  };

  useEffect(() => {
    void loadRecentOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when supplier scope changes; toast stable enough
  }, [enforceSupplierId]);

  useEffect(() => {
    void loadStockItemCodeSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enforceSupplierId]);

  const selectedOrder = orders?.find((o) => o.id === poId.trim());

  const onSubmitInvoice = async () => {
    const id = poId.trim();
    if (!id) {
      toast({ variant: "destructive", title: "Purchase order id required" });
      return;
    }
    setBusy(true);
    try {
      const r = await submitEtimsInvoiceForPurchaseOrder(id, {
        enforceSupplierId: enforceSupplierId ?? undefined,
        customerPin: customerPin.trim() || undefined,
        customerName: customerName.trim() || undefined,
        currency: invoiceCurrency?.trim() || undefined,
        exchangeRate: invoiceExchangeRate ?? undefined,
        countryCode: invoiceCountryCode?.trim() || undefined,
      });
      if (!r.ok) {
        const hint =
          /no item with name/i.test(r.message) || /item.*not found/i.test(r.message)
            ? " The integrator has no item registered with that identifier for this environment. Confirm the code exists on your OSCU/VFD item master, or register the SKU with KRA before invoicing."
            : "";
        toast({ variant: "destructive", title: "eTIMS submit failed", description: `${r.message}${hint}` });
        return;
      }
      toast({ title: "Submitted", description: "Invoice sent to integrator; order row updated." });
    } finally {
      setBusy(false);
    }
  };

  const onPushStock = async () => {
    const code = stockItemCode.trim();
    const n = Number(stockQty);
    if (!code || !Number.isFinite(n)) {
      toast({ variant: "destructive", title: "Item code and numeric stock required" });
      return;
    }
    setStockBusy(true);
    try {
      const r = await pushEtimsItemStockLevel(code, n);
      if (!r.ok) {
        toast({ variant: "destructive", title: "Stock update failed", description: r.message });
        return;
      }
      toast({ title: "Stock pushed", description: `${code} → ${n}` });
    } finally {
      setStockBusy(false);
    }
  };

  return (
    <div className="space-y-6 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-foreground">
        <Send className="h-4 w-4 shrink-0" />
        <h3 className="text-sm font-semibold">Purchase order → eTIMS invoice</h3>
      </div>
      <Alert className="border-border bg-muted/30">
        <Package className="h-4 w-4" />
        <AlertTitle className="text-foreground">Line mapping (step 1)</AlertTitle>
        <AlertDescription className="text-muted-foreground text-xs leading-relaxed">
          Each line needs a KRA item code for the integrator: set{" "}
          <code className="rounded bg-muted px-1">etims_item_code</code> on the PO JSON, or store it on{" "}
          <code className="rounded bg-muted px-1">supplier_product_prices</code> /{" "}
          <code className="rounded bg-muted px-1">materials</code> for the same{" "}
          <code className="rounded bg-muted px-1">material_id</code> (the app fills missing codes at submit). Suppliers can
          set the code when adding or editing a product in their catalog; admins can set it from Product Submissions (edit on
          any tab).           Optional per line: <code className="rounded bg-muted px-1">taxCode</code> (A–E). If submission fails with
          &quot;No item with name: …&quot;, that code is not on the linked eTIMS item register for this sandbox or
          production tenant—register the item with KRA or use a code your integrator has already provisioned.
        </AlertDescription>
      </Alert>

      {(invoiceCurrency || invoiceCountryCode || (invoiceExchangeRate != null && invoiceExchangeRate !== 1)) && (
        <p className="text-xs text-muted-foreground">
          Invoice payload: currency{" "}
          <span className="font-mono text-foreground">{invoiceCurrency?.trim() || "KES (default)"}</span>
          {invoiceExchangeRate != null && invoiceExchangeRate !== 1 ? (
            <>
              , rate <span className="font-mono text-foreground">{invoiceExchangeRate}</span>
            </>
          ) : null}
          {invoiceCountryCode?.trim() ? (
            <>
              , country <span className="font-mono text-foreground">{invoiceCountryCode.trim()}</span>
            </>
          ) : null}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label className="text-foreground">Purchase order</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 text-xs"
              disabled={ordersLoading}
              onClick={() => void loadRecentOrders()}
            >
              {ordersLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh list
            </Button>
          </div>
          <Popover open={poPickerOpen} onOpenChange={setPoPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={poPickerOpen}
                disabled={ordersLoading || orders === null}
                className="h-10 w-full justify-between font-normal"
              >
                <span className="truncate text-left">
                  {ordersLoading
                    ? "Loading orders…"
                    : orders && orders.length === 0
                      ? enforceSupplierId
                        ? "No purchase orders for this supplier yet"
                        : "No purchase orders visible to your account"
                      : selectedOrder
                        ? `${selectedOrder.po_number} · ${selectedOrder.status} · ${formatPoDate(selectedOrder.created_at)} · ${formatKesAmount(selectedOrder.total_amount)}`
                        : "Select an order from the system…"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(calc(100vw-2rem),28rem)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by PO number, status, or id…" className="h-10" />
                <CommandList>
                  <CommandEmpty>No matching orders.</CommandEmpty>
                  <CommandGroup>
                    {(orders ?? []).map((row) => (
                      <CommandItem
                        key={row.id}
                        value={`${row.po_number} ${row.status} ${row.id} ${formatPoDate(row.created_at)}`}
                        onSelect={() => {
                          setPoId(row.id);
                          setPoPickerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4 shrink-0", poId.trim() === row.id ? "opacity-100" : "opacity-0")} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{row.po_number}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {row.status} · {formatPoDate(row.created_at)} · {formatKesAmount(row.total_amount)}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground/80 truncate">{row.id}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {enforceSupplierId
              ? "Showing recent orders for this supplier (same list as your dashboard access)."
              : "Showing recent orders you can read (admin: broader access; others: per RLS)."}
          </p>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="etims-po-id">Order UUID (optional manual entry)</Label>
          <Input
            id="etims-po-id"
            placeholder="Filled when you pick above — or paste UUID"
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="etims-pin">Buyer KRA PIN (optional)</Label>
          <Input id="etims-pin" value={customerPin} onChange={(e) => setCustomerPin(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="etims-name">Buyer name (optional)</Label>
          <Input id="etims-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
      </div>

      <Button type="button" disabled={busy} onClick={onSubmitInvoice}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span className="ml-2">Submit invoice to integrator</span>
      </Button>

      <div className="border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Item stock (integrator)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Calls <code className="rounded bg-muted px-1">PUT …/items/{"{code}"}/stocks</code> via the same Edge proxy.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="etims-stock-code">Item code</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 text-xs"
                disabled={stockCodesLoading}
                onClick={() => void loadStockItemCodeSuggestions()}
              >
                {stockCodesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh catalog codes
              </Button>
            </div>
            <datalist id="etims-stock-code-datalist">
              {stockCodeSuggestions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </datalist>
            <Input
              id="etims-stock-code"
              list="etims-stock-code-datalist"
              placeholder="Integrator item code (from your OSCU / integrator list)"
              value={stockItemCode}
              onChange={(e) => setStockItemCode(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {enforceSupplierId?.trim()
                ? "Dropdown lists materials and supplier price rows that have an eTIMS code for this supplier. You can still paste any integrator code."
                : "Dropdown lists catalog rows with codes (recent materials). Narrow codes by using this card on a supplier-scoped page when possible."}
            </p>
          </div>
          <div className="w-full space-y-1.5 sm:w-32">
            <Label htmlFor="etims-stock-n">Stock</Label>
            <Input
              id="etims-stock-n"
              type="number"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" disabled={stockBusy} onClick={onPushStock}>
            {stockBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className={stockBusy ? "ml-2" : ""}>Push stock</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
