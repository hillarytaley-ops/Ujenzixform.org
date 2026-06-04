import { submitEtimsInvoiceForPurchaseOrder } from "@/lib/etims/purchaseOrderEtims";

/**
 * Best-effort: submit the purchase order to the **KRA / VFD integrator** (via `etims-proxy` Edge function) as soon as
 * the builder accepts a supplier quote. The integrator response is stored on `purchase_orders` (`etims_*` columns);
 * this path does **not** depend on GRN or delivery completion.
 *
 * Runs in the browser as the signed-in builder — if they close the tab immediately, the request may still be in flight.
 * Failures are console-only; suppliers can retry from **eTIMS test** or support can investigate `etims_error` on the PO.
 */
export function fireAndForgetEtimsInvoiceOnQuoteAccept(purchaseOrderId: string): void {
  const id = purchaseOrderId?.trim();
  if (!id) return;
  void submitEtimsInvoiceForPurchaseOrder(id, {}).then((r) => {
    if (!r.ok) {
      console.warn("[eTIMS] Auto-submit after quote accept:", r.message);
    }
  });
}
