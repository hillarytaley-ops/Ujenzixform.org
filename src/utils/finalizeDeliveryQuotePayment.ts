import type { SupabaseClient } from "@supabase/supabase-js";

/** After Paystack verify: mark delivery quote paid and alert providers (idempotent). */
export async function finalizeDeliveryQuotePayment(
  supabase: SupabaseClient,
  deliveryRequestId: string,
  paystackReference: string,
  paidAt: string,
): Promise<void> {
  const { data: row, error: selErr } = await supabase
    .from("delivery_requests")
    .select("id,status")
    .eq("id", deliveryRequestId)
    .maybeSingle();

  if (selErr) {
    console.warn("[paystack] delivery quote lookup:", selErr.message);
    return;
  }
  if (!row) {
    console.warn("[paystack] delivery quote not found:", deliveryRequestId);
    return;
  }

  const status = String(row.status ?? "");

  if (status === "delivery_quote_paid") {
    await notifyDeliveryProvidersQuotePaid(supabase, deliveryRequestId);
    return;
  }

  if (status !== "quote_accepted") {
    console.warn("[paystack] delivery quote unexpected status after payment:", status);
    return;
  }

  const { error: upErr } = await supabase
    .from("delivery_requests")
    .update({
      status: "delivery_quote_paid",
      delivery_quote_paid_at: paidAt,
      delivery_quote_paystack_reference: paystackReference || null,
      updated_at: paidAt,
    })
    .eq("id", deliveryRequestId)
    .eq("status", "quote_accepted");

  if (upErr) {
    console.warn("[paystack] delivery quote update:", upErr.message);
    return;
  }

  const { data: after } = await supabase
    .from("delivery_requests")
    .select("status")
    .eq("id", deliveryRequestId)
    .maybeSingle();

  if (String(after?.status ?? "") === "delivery_quote_paid") {
    await notifyDeliveryProvidersQuotePaid(supabase, deliveryRequestId);
  }
}

async function notifyDeliveryProvidersQuotePaid(
  supabase: SupabaseClient,
  deliveryRequestId: string,
): Promise<void> {
  try {
    const { error: rpcErr } = await supabase.rpc("notify_delivery_providers_quote_paid", {
      p_delivery_request_id: deliveryRequestId,
    });
    if (rpcErr) {
      console.warn("[paystack] notify_delivery_providers_quote_paid:", rpcErr.message);
    }
  } catch (e: unknown) {
    console.warn("[paystack] notify_delivery_providers_quote_paid:", e);
  }
}
