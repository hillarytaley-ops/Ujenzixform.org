import { submitEtimsInvoiceForPurchaseOrder } from "@/lib/etims/purchaseOrderEtims";
import { logTisSubmission } from "@/lib/etims/logTisSubmission";

/**
 * Best-effort KRA sandbox / integrator invoice when a purchase order is confirmed at checkout.
 * Uses the supplier's KRA PIN on the invoice payload (multi-tenant vendor invoicing).
 */
export function fireAndForgetEtimsInvoiceOnOrderConfirmed(
  purchaseOrderId: string,
  supplierId?: string | null,
): void {
  const id = purchaseOrderId?.trim();
  if (!id) return;

  void submitEtimsInvoiceForPurchaseOrder(id, {}).then(async (r) => {
    if (!r.ok) {
      console.warn("[eTIMS] Auto-submit on order confirm:", r.message);
      await logTisSubmission({
        supplierId: supplierId ?? null,
        purchaseOrderId: id,
        submissionType: "sale",
        status: "failed",
        errorMessage: r.message,
      });
      return;
    }
    await logTisSubmission({
      supplierId: supplierId ?? null,
      purchaseOrderId: id,
      submissionType: "sale",
      status: "success",
      responseSnapshot: r.data,
    });
  });
}
