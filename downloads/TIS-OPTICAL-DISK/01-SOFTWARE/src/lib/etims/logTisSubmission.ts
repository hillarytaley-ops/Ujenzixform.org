/**
 * Log TIS integrator submission events for ops dashboard (best-effort; non-blocking).
 */

import { supabase } from "@/integrations/supabase/client";

export type TisSubmissionLogInput = {
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  submissionType: "sale" | "credit_note" | "item" | "customer" | "stock";
  status: "success" | "failed" | "pending";
  traderInvoiceNo?: string | null;
  errorMessage?: string | null;
  responseSnapshot?: unknown;
};

export async function logTisSubmission(input: TisSubmissionLogInput): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("tis_submission_log").insert({
      supplier_id: input.supplierId ?? null,
      purchase_order_id: input.purchaseOrderId ?? null,
      submission_type: input.submissionType,
      status: input.status,
      trader_invoice_no: input.traderInvoiceNo ?? null,
      error_message: input.errorMessage ?? null,
      response_snapshot: input.responseSnapshot ?? null,
      created_by: auth.user?.id ?? null,
    });
  } catch {
    /* audit log is best-effort */
  }
}
