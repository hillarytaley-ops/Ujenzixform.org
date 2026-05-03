/**
 * Paystack charge webhooks. Configure URL in Paystack Dashboard → Settings → API & Webhooks.
 * URL: https://<project-ref>.supabase.co/functions/v1/paystack-webhook
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import * as shell from "../_shared/emailShell.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function amountMajorUnits(amountMinor: unknown, currency: unknown): number | null {
  const a = Number(amountMinor);
  if (!Number.isFinite(a)) return null;
  const c = String(currency ?? "KES").toUpperCase();
  if (["KES", "NGN", "GHS", "ZAR", "USD", "EUR", "GBP"].includes(c)) return Math.round(a) / 100;
  return Math.round(a) / 100;
}

async function resendSend(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !to) return;
  const from = Deno.env.get("RESEND_FROM_TRANSACTIONAL") ?? "UjenziXform <info@ujenzixform.org>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) console.error("[paystack-webhook] Resend:", j);
}

async function authNameEmail(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ email: string; name: string } | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  const meta = data.user.user_metadata as Record<string, unknown> | undefined;
  const fn = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  const name = fn || data.user.email.split("@")[0] || "there";
  return { email: data.user.email, name };
}

async function dashboardPathForUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (data?.role === "professional_builder") return "/professional-builder-dashboard";
  return "/private-client-dashboard";
}

async function poBuyerMatchesUser(
  admin: ReturnType<typeof createClient>,
  buyerId: string,
  authUserId: string,
): Promise<boolean> {
  if (buyerId === authUserId) return true;
  const { data } = await admin.from("profiles").select("id").eq("user_id", authUserId).maybeSingle();
  return data?.id === buyerId;
}

/** True if the paying user (auth.users.id from Paystack metadata) owns this invoice for settlement. */
async function invoicePayerMatchesUser(
  admin: ReturnType<typeof createClient>,
  inv: { builder_id?: unknown; purchase_order_id?: unknown },
  authUserId: string,
): Promise<boolean> {
  const builderId = typeof inv.builder_id === "string" ? inv.builder_id : "";
  if (builderId && builderId === authUserId) return true;
  const { data: prof } = await admin.from("profiles").select("id").eq("user_id", authUserId).maybeSingle();
  if (prof?.id && builderId === prof.id) return true;
  const poId = typeof inv.purchase_order_id === "string" ? inv.purchase_order_id : "";
  if (!poId) return false;
  const { data: po, error } = await admin
    .from("purchase_orders")
    .select("buyer_id")
    .eq("id", poId)
    .maybeSingle();
  if (error || !po?.buyer_id) return false;
  return poBuyerMatchesUser(admin, po.buyer_id as string, authUserId);
}

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
    const currency = data?.currency;
    const paidMajor = amountMajorUnits(data?.amount, currency);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (orderId.startsWith("inv_") && metaUser) {
      const invoiceId = orderId.slice(4);

      const { data: inv, error: invErr } = await admin
        .from("invoices")
        .select("id, builder_id, purchase_order_id, payment_status, notes, total_amount")
        .eq("id", invoiceId)
        .maybeSingle();

      if (invErr) {
        console.error("[paystack-webhook] invoice lookup:", invErr.message);
      } else if (inv && inv.payment_status !== "paid") {
        const allowed = await invoicePayerMatchesUser(admin, inv, metaUser);
        if (allowed) {
          const stamp = new Date().toISOString();
          const line = reference
            ? `\n[${stamp}] Paystack charge.success — ref: ${reference}`
            : `\n[${stamp}] Paystack charge.success`;
          const prevNotes = typeof inv.notes === "string" ? inv.notes : "";
          const invTotal = Number((inv as { total_amount?: unknown }).total_amount);
          const amountFromGateway =
            paidMajor != null && Number.isFinite(paidMajor) ? paidMajor : null;
          const amountPaid =
            amountFromGateway != null && amountFromGateway > 0
              ? amountFromGateway
              : Number.isFinite(invTotal) && invTotal > 0
              ? invTotal
              : 0;
          const { error: upErr } = await admin
            .from("invoices")
            .update({
              payment_status: "paid",
              amount_paid: amountPaid,
              paid_at: stamp,
              updated_at: stamp,
              notes: `${prevNotes}${line}`.trim(),
            })
            .eq("id", invoiceId);
          if (upErr) {
            console.error("[paystack-webhook] invoice update:", upErr.message);
          } else {
            console.log("[paystack-webhook] marked invoice paid:", invoiceId);
            const who = await authNameEmail(admin, metaUser);
            if (who) {
              const { subject, html } = shell.htmlInvoicePaid({
                name: who.name,
                invoiceId,
                reference,
              });
              await resendSend(who.email, subject, html);
            } else {
              console.warn("[paystack-webhook] invoice paid email: no auth user", invoiceId);
            }
          }
        } else {
          console.warn("[paystack-webhook] invoice payer not authorized for this charge; skip", invoiceId);
        }
      }
    } else if (orderId.startsWith("drq_") && metaUser) {
      const drId = orderId.slice(4);

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
            const dashPath = await dashboardPathForUser(admin, metaUser);
            const who = await authNameEmail(admin, metaUser);
            if (who) {
              const { subject, html } = shell.htmlDeliveryQuotePaid({
                name: who.name,
                requestId: drId,
                reference,
                dashboardPath: dashPath,
              });
              await resendSend(who.email, subject, html);
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
        const { data: paidRows, error: upMsr } = await admin
          .from("monitoring_service_requests")
          .update({
            status: "approved",
            paid_at: stamp,
            paystack_reference: reference || null,
            updated_at: stamp,
            admin_notes: `${prevNotes}${line}`.trim(),
          })
          .eq("id", msrId)
          .eq("status", "pending_payment")
          .select("id");

        if (upMsr) {
          console.error("[paystack-webhook] monitoring_service_requests update:", upMsr.message);
        } else if (paidRows && paidRows.length > 0) {
          console.log("[paystack-webhook] marked monitoring package paid / approved:", msrId);
          const dashPath = await dashboardPathForUser(admin, metaUser);
          const who = await authNameEmail(admin, metaUser);
          if (who) {
            const { subject, html } = shell.htmlMonitoringPaid({
              name: who.name,
              requestId: msrId,
              reference,
              dashboardPath: dashPath,
            });
            await resendSend(who.email, subject, html);
          }
        } else {
          console.log("[paystack-webhook] monitoring already processed; skip email:", msrId);
        }
      } else if (msr && msr.user_id !== metaUser) {
        console.warn(
          "[paystack-webhook] metadata user_id does not match monitoring_service_requests.user_id; skip",
          msrId,
        );
      }
    } else if (orderId.startsWith("etims_po_") && metaUser) {
      const rawId = orderId.slice("etims_po_".length);
      if (!UUID_RE.test(rawId)) {
        console.warn("[paystack-webhook] invalid etims_po order id:", orderId);
      } else {
        const poId = rawId;
        const { data: po, error: poErr } = await admin
          .from("purchase_orders")
          .select(
            "id, buyer_id, po_number, builder_etims_paystack_paid_at, builder_etims_paystack_reference",
          )
          .eq("id", poId)
          .maybeSingle();

        if (poErr) {
          console.error("[paystack-webhook] etims_po purchase_orders lookup:", poErr.message);
        } else if (!po) {
          console.warn("[paystack-webhook] etims_po purchase_order not found:", poId);
        } else {
          const belongs = await poBuyerMatchesUser(admin, po.buyer_id as string, metaUser);
          if (!belongs) {
            console.warn("[paystack-webhook] etims_po buyer does not match metadata user; skip", poId);
          } else if (po.builder_etims_paystack_paid_at) {
            if (reference && String(po.builder_etims_paystack_reference ?? "") === reference) {
              console.log("[paystack-webhook] etims_po duplicate webhook for same reference; skip", poId);
            } else {
              console.log("[paystack-webhook] etims_po already marked paid; skip", poId);
            }
          } else {
            const stamp = new Date().toISOString();
            const { error: upErr } = await admin
              .from("purchase_orders")
              .update({
                builder_etims_paystack_paid_at: stamp,
                builder_etims_paystack_reference: reference || null,
                updated_at: stamp,
              })
              .eq("id", poId);
            if (upErr) {
              console.error("[paystack-webhook] etims_po purchase_orders update:", upErr.message);
            } else {
              console.log("[paystack-webhook] etims_po builder eTIMS receipt marked paid:", poId);
            }
          }
        }
      }
    } else if (UUID_RE.test(orderId) && metaUser) {
      const { data: po, error: poErr } = await admin
        .from("purchase_orders")
        .select("id, buyer_id, po_number, items, total_amount, supplier_notes")
        .eq("id", orderId)
        .maybeSingle();

      if (poErr) {
        console.error("[paystack-webhook] purchase_orders lookup:", poErr.message);
      } else if (!po) {
        console.warn("[paystack-webhook] purchase_order not found:", orderId);
      } else {
        const belongs = await poBuyerMatchesUser(admin, po.buyer_id as string, metaUser);
        if (!belongs) {
          console.warn("[paystack-webhook] PO buyer does not match metadata user; skip", orderId);
        } else {
          const prevNotes = typeof po.supplier_notes === "string" ? po.supplier_notes : "";
          if (reference && prevNotes.includes(reference)) {
            console.log("[paystack-webhook] PO payment already recorded for reference; skip", orderId);
          } else {
            const stamp = new Date().toISOString();
            const line = reference
              ? `\n[${stamp}] Paystack charge.success — ref: ${reference}`
              : `\n[${stamp}] Paystack charge.success`;
            const { error: poUp } = await admin
              .from("purchase_orders")
              .update({
                supplier_notes: `${prevNotes}${line}`.trim(),
                updated_at: stamp,
              })
              .eq("id", orderId);
            if (poUp) {
              console.error("[paystack-webhook] purchase_orders note update:", poUp.message);
            } else {
              const total =
                paidMajor != null && paidMajor > 0 ? paidMajor : Number(po.total_amount) || 0;
              const dashPath = await dashboardPathForUser(admin, metaUser);
              const who = await authNameEmail(admin, metaUser);
              if (who) {
                const { subject, html } = shell.htmlPaymentReceivedPo({
                  name: who.name,
                  poNumber: String(po.po_number ?? orderId.slice(0, 8)),
                  total,
                  reference,
                  items: po.items,
                  dashboardPath: dashPath,
                });
                await resendSend(who.email, subject, html);
              }
              console.log("[paystack-webhook] PO payment recorded + email:", orderId);
            }
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
