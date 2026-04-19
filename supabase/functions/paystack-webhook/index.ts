/**
 * Paystack charge webhooks. Configure URL in Paystack Dashboard → Settings → API & Webhooks.
 * URL: https://<project-ref>.supabase.co/functions/v1/paystack-webhook
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const hash = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);

  if (hash !== signature) {
    console.warn("[paystack-webhook] invalid signature");
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ev = event.event ?? "";
  const data = event.data as Record<string, unknown> | undefined;
  const reference = typeof data?.reference === "string" ? data.reference : "";
  console.log("[paystack-webhook]", ev, reference);

  if (ev === "charge.success" && SERVICE_ROLE_KEY && SUPABASE_URL) {
    const meta = data?.metadata as Record<string, unknown> | undefined;
    const orderId = typeof meta?.order_id === "string" ? meta.order_id.trim() : "";
    const metaUser = typeof meta?.user_id === "string" ? meta.user_id.trim() : "";

    if (orderId.startsWith("inv_") && metaUser) {
      const invoiceId = orderId.slice(4);
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: inv, error: invErr } = await admin
        .from("invoices")
        .select("id, builder_id, payment_status, notes")
        .eq("id", invoiceId)
        .maybeSingle();

      if (invErr) {
        console.error("[paystack-webhook] invoice lookup:", invErr.message);
      } else if (inv && inv.builder_id === metaUser && inv.payment_status !== "paid") {
        const stamp = new Date().toISOString();
        const line = reference
          ? `\n[${stamp}] Paystack charge.success — ref: ${reference}`
          : `\n[${stamp}] Paystack charge.success`;
        const prevNotes = typeof inv.notes === "string" ? inv.notes : "";
        const { error: upErr } = await admin
          .from("invoices")
          .update({
            payment_status: "paid",
            updated_at: stamp,
            notes: `${prevNotes}${line}`.trim(),
          })
          .eq("id", invoiceId);
        if (upErr) {
          console.error("[paystack-webhook] invoice update:", upErr.message);
        } else {
          console.log("[paystack-webhook] marked invoice paid:", invoiceId);
        }
      } else if (inv && inv.builder_id !== metaUser) {
        console.warn("[paystack-webhook] metadata user_id does not match invoice.builder_id; skip", invoiceId);
      }
    } else if (orderId.startsWith("drq_") && metaUser) {
      const drId = orderId.slice(4);
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: prof, error: profErr } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", metaUser)
        .maybeSingle();

      if (profErr) {
        console.error("[paystack-webhook] profile lookup:", profErr.message);
      } else if (prof?.id) {
        const { data: dr, error: drErr } = await admin
          .from("delivery_requests")
          .select("id, builder_id, status")
          .eq("id", drId)
          .maybeSingle();

        if (drErr) {
          console.error("[paystack-webhook] delivery_request lookup:", drErr.message);
        } else if (
          dr &&
          dr.builder_id === prof.id &&
          dr.status === "quote_accepted"
        ) {
          const stamp = new Date().toISOString();
          const { data: drPaidRows, error: upDr } = await admin
            .from("delivery_requests")
            .update({
              status: "delivery_quote_paid",
              delivery_quote_paid_at: stamp,
              delivery_quote_paystack_reference: reference || null,
              updated_at: stamp,
            })
            .eq("id", drId)
            .eq("status", "quote_accepted")
            .select("id");

          if (upDr) {
            console.error("[paystack-webhook] delivery_request update:", upDr.message);
          } else if (drPaidRows && drPaidRows.length > 0) {
            console.log("[paystack-webhook] marked delivery quote paid:", drId);
            const { error: rpcErr } = await admin.rpc("notify_delivery_providers_quote_paid", {
              p_delivery_request_id: drId,
            });
            if (rpcErr) {
              console.error("[paystack-webhook] notify_delivery_providers_quote_paid:", rpcErr.message);
            } else {
              console.log("[paystack-webhook] delivery provider alerts sent for:", drId);
            }
          } else {
            console.log(
              "[paystack-webhook] delivery quote already paid or status not quote_accepted; skip update and alerts:",
              drId,
            );
          }
        }
      }
    } else if (orderId.startsWith("msr_") && metaUser) {
      const msrId = orderId.slice(4);
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: msr, error: msrErr } = await admin
        .from("monitoring_service_requests")
        .select("id, user_id, status")
        .eq("id", msrId)
        .maybeSingle();

      if (msrErr) {
        console.error("[paystack-webhook] monitoring_service_requests lookup:", msrErr.message);
      } else if (
        msr &&
        msr.user_id === metaUser &&
        String(msr.status) === "pending_payment"
      ) {
        const stamp = new Date().toISOString();
        const line = reference
          ? `\n[${stamp}] Paystack charge.success — ref: ${reference}`
          : `\n[${stamp}] Paystack charge.success`;
        const { data: prevRow, error: prevErr } = await admin
          .from("monitoring_service_requests")
          .select("admin_notes")
          .eq("id", msrId)
          .maybeSingle();
        if (prevErr) {
          console.error("[paystack-webhook] monitoring admin_notes read:", prevErr.message);
        }
        const prevNotes = typeof prevRow?.admin_notes === "string" ? prevRow.admin_notes : "";
        const { error: upMsr } = await admin
          .from("monitoring_service_requests")
          .update({
            status: "approved",
            paid_at: stamp,
            paystack_reference: reference || null,
            updated_at: stamp,
            admin_notes: `${prevNotes}${line}`.trim(),
          })
          .eq("id", msrId)
          .eq("status", "pending_payment");

        if (upMsr) {
          console.error("[paystack-webhook] monitoring_service_requests update:", upMsr.message);
        } else {
          console.log("[paystack-webhook] marked monitoring package paid / approved:", msrId);
        }
      } else if (msr && msr.user_id !== metaUser) {
        console.warn(
          "[paystack-webhook] metadata user_id does not match monitoring_service_requests.user_id; skip",
          msrId,
        );
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
