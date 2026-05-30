/**
 * Resolve authoritative Paystack checkout amount from orderId + authenticated user.
 * Prevents client-supplied amount tampering in paystack-initialize.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrderAmountResult =
  | { ok: true; amountMajor: number; currency: string }
  | { ok: false; error: string; status: number };

async function buyerOwnsProfile(
  supabase: SupabaseClient,
  buyerId: string,
  authUserId: string,
): Promise<boolean> {
  if (buyerId === authUserId) return true;
  const { data } = await supabase.from("profiles").select("id").eq("user_id", authUserId).maybeSingle();
  return data?.id === buyerId;
}

function parsePositiveAmount(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export async function resolvePaystackOrderAmount(
  supabase: SupabaseClient,
  authUserId: string,
  orderIdRaw: string,
): Promise<OrderAmountResult> {
  const orderId = orderIdRaw.trim();
  if (!orderId) {
    return { ok: false, error: "orderId is required.", status: 400 };
  }

  if (orderId.startsWith("inv_")) {
    const invoiceId = orderId.slice(4);
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("id, builder_id, total_amount, payment_status")
      .eq("id", invoiceId)
      .maybeSingle();
    if (error || !inv) {
      return { ok: false, error: "Invoice not found.", status: 404 };
    }
    if (inv.payment_status === "paid") {
      return { ok: false, error: "Invoice is already paid.", status: 409 };
    }
    const builderId = String((inv as { builder_id?: string }).builder_id ?? "");
    if (builderId !== authUserId) {
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", authUserId).maybeSingle();
      if (!prof?.id || builderId !== prof.id) {
        return { ok: false, error: "You are not authorized to pay this invoice.", status: 403 };
      }
    }
    const amount = parsePositiveAmount((inv as { total_amount?: unknown }).total_amount);
    if (amount == null) return { ok: false, error: "Invoice has no payable amount.", status: 400 };
    return { ok: true, amountMajor: amount, currency: "KES" };
  }

  if (orderId.startsWith("drq_")) {
    const drId = orderId.slice(4);
    const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", authUserId).maybeSingle();
    if (!prof?.id) return { ok: false, error: "Profile required for delivery payment.", status: 403 };
    const { data: dr, error } = await supabase
      .from("delivery_requests")
      .select("id, builder_id, status, delivery_quote_amount")
      .eq("id", drId)
      .maybeSingle();
    if (error || !dr) return { ok: false, error: "Delivery request not found.", status: 404 };
    if (dr.builder_id !== prof.id) {
      return { ok: false, error: "You are not authorized to pay this delivery quote.", status: 403 };
    }
    if (dr.status !== "quote_accepted") {
      return { ok: false, error: "Delivery quote is not ready for payment.", status: 409 };
    }
    const amount = parsePositiveAmount((dr as { delivery_quote_amount?: unknown }).delivery_quote_amount);
    if (amount == null) return { ok: false, error: "Delivery quote has no amount.", status: 400 };
    return { ok: true, amountMajor: amount, currency: "KES" };
  }

  if (orderId.startsWith("msr_")) {
    const msrId = orderId.slice(4);
    const { data: msr, error } = await supabase
      .from("monitoring_service_requests")
      .select("id, user_id, status, quoted_amount")
      .eq("id", msrId)
      .maybeSingle();
    if (error || !msr) return { ok: false, error: "Monitoring request not found.", status: 404 };
    if (msr.user_id !== authUserId) {
      return { ok: false, error: "You are not authorized to pay this monitoring package.", status: 403 };
    }
    if (String(msr.status) !== "pending_payment") {
      return { ok: false, error: "Monitoring package is not pending payment.", status: 409 };
    }
    const amount = parsePositiveAmount((msr as { quoted_amount?: unknown }).quoted_amount);
    if (amount == null) return { ok: false, error: "Monitoring package has no quoted amount.", status: 400 };
    return { ok: true, amountMajor: amount, currency: "KES" };
  }

  const poId = orderId.startsWith("etims_po_") ? orderId.slice("etims_po_".length) : orderId;
  if (!UUID_RE.test(poId)) {
    return { ok: false, error: "Unrecognized order reference.", status: 400 };
  }

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, buyer_id, total_amount")
    .eq("id", poId)
    .maybeSingle();
  if (poErr || !po) return { ok: false, error: "Purchase order not found.", status: 404 };

  const owns = await buyerOwnsProfile(supabase, String(po.buyer_id), authUserId);
  if (!owns) {
    return { ok: false, error: "You are not authorized to pay this order.", status: 403 };
  }

  const amount = parsePositiveAmount((po as { total_amount?: unknown }).total_amount);
  if (amount == null) return { ok: false, error: "Order has no payable amount.", status: 400 };
  return { ok: true, amountMajor: amount, currency: "KES" };
}

/** Reject if client amount differs from server amount (1 minor unit tolerance). */
export function amountsMatch(clientMajor: number, serverMajor: number): boolean {
  return Math.abs(clientMajor - serverMajor) < 0.02;
}
