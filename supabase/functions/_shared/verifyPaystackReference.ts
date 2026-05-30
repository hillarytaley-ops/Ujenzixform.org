/**
 * Verify a Paystack transaction reference via the Paystack API (server-side secret).
 */
export type PaystackVerifyResult =
  | {
      ok: true;
      success: boolean;
      amountMajor: number;
      currency: string;
      metadata: Record<string, unknown>;
      reference: string;
    }
  | { ok: false; error: string };

export async function verifyPaystackReference(reference: string): Promise<PaystackVerifyResult> {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  if (!key) {
    return { ok: false, error: "Paystack is not configured." };
  }

  const ref = reference.trim();
  if (!ref) {
    return { ok: false, error: "payment_reference is required." };
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.status) {
    return { ok: false, error: json?.message || "Paystack verification failed." };
  }

  const d = json.data ?? {};
  const amountMinor = typeof d.amount === "number" ? d.amount : 0;
  const metadata = (d.metadata && typeof d.metadata === "object")
    ? d.metadata as Record<string, unknown>
    : {};

  return {
    ok: true,
    success: d.status === "success",
    amountMajor: amountMinor / 100,
    currency: String(d.currency ?? "KES").toUpperCase(),
    metadata,
    reference: String(d.reference ?? ref),
  };
}
