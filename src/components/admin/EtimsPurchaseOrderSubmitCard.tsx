/**
 * Beta: submit a UjenziXform purchase order to the integrator as an eTIMS/VFD invoice.
 * Lines in purchase_orders.items must include `etims_item_code` per row (see purchaseOrderEtims.ts).
 */

import React, { useState } from "react";
import { Loader2, Send, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { pushEtimsItemStockLevel, submitEtimsInvoiceForPurchaseOrder } from "@/lib/etims/purchaseOrderEtims";

export type EtimsPurchaseOrderSubmitCardProps = {
  /** When set, PO must belong to this supplier row id */
  enforceSupplierId?: string | null;
};

export const EtimsPurchaseOrderSubmitCard: React.FC<EtimsPurchaseOrderSubmitCardProps> = ({
  enforceSupplierId,
}) => {
  const { toast } = useToast();
  const [poId, setPoId] = useState("");
  const [customerPin, setCustomerPin] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [stockItemCode, setStockItemCode] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockBusy, setStockBusy] = useState(false);

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
      });
      if (!r.ok) {
        toast({ variant: "destructive", title: "eTIMS submit failed", description: r.message });
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
          Each object in <code className="rounded bg-muted px-1">purchase_orders.items</code> must include{" "}
          <code className="rounded bg-muted px-1">etims_item_code</code> (KRA item code). Use your integrator catalog or{" "}
          <code className="rounded bg-muted px-1">POST /items</code> first. Optional per line:{" "}
          <code className="rounded bg-muted px-1">taxCode</code> (A–E).
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="etims-po-id">Purchase order UUID</Label>
          <Input
            id="etims-po-id"
            placeholder="e.g. 8b2c…-…-…"
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
            <Label htmlFor="etims-stock-code">Item code</Label>
            <Input
              id="etims-stock-code"
              placeholder="KE1UCT…"
              value={stockItemCode}
              onChange={(e) => setStockItemCode(e.target.value)}
              className="font-mono text-sm"
            />
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
