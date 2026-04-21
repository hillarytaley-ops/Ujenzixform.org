/**
 * Send email to supplier when a delivery_note is created (delivery completed / DN workflow).
 * Invoked from Postgres via pg_net (see migration) with header x-dn-email-secret, or manually.
 *
 * Secrets (Supabase Edge Function):
 * - DELIVERY_NOTE_EMAIL_SECRET — must match database setting app.dn_email_notify_secret
 * - RESEND_API_KEY
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { htmlSupplierDeliveryNoteReady } from "../_shared/emailShell.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dn-email-secret",
};

interface Body {
  delivery_note_id?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("DELIVERY_NOTE_EMAIL_SECRET");
  const supplied = req.headers.get("x-dn-email-secret");
  if (!expected || supplied !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const deliveryNoteId = body.delivery_note_id?.trim();
  if (!deliveryNoteId) {
    return new Response(JSON.stringify({ error: "delivery_note_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("notify-supplier-delivery-note: RESEND_API_KEY not set");
    return new Response(JSON.stringify({ success: false, skipped: true, reason: "no_resend" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: dn, error: dnErr } = await supabase
    .from("delivery_notes")
    .select("id, dn_number, supplier_id, purchase_order_id, status, delivery_address, delivery_date")
    .eq("id", deliveryNoteId)
    .maybeSingle();

  if (dnErr || !dn) {
    console.error("notify-supplier-delivery-note: DN fetch", dnErr);
    return new Response(JSON.stringify({ error: "Delivery note not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let poNumber: string | null = null;
  if (dn.purchase_order_id) {
    const { data: po } = await supabase
      .from("purchase_orders")
      .select("po_number, buyer_id")
      .eq("id", dn.purchase_order_id)
      .maybeSingle();
    poNumber = po?.po_number ?? null;
  }

  const sid = dn.supplier_id as string;
  let supplierEmail: string | null = null;
  let companyName = "Supplier";

  const { data: byId } = await supabase
    .from("suppliers")
    .select("email, company_name")
    .eq("id", sid)
    .maybeSingle();
  if (byId?.email) {
    supplierEmail = byId.email;
    companyName = byId.company_name || companyName;
  } else {
    const { data: byUser } = await supabase
      .from("suppliers")
      .select("email, company_name")
      .eq("user_id", sid)
      .maybeSingle();
    if (byUser?.email) {
      supplierEmail = byUser.email;
      companyName = byUser.company_name || companyName;
    }
  }

  if (!supplierEmail) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(sid);
      if (!authErr && authData?.user?.email) {
        supplierEmail = authData.user.email;
      }
    } catch (e) {
      console.warn("notify-supplier-delivery-note: auth lookup failed", e);
    }
  }

  if (!supplierEmail) {
    console.warn("notify-supplier-delivery-note: no email for supplier_id", sid);
    return new Response(JSON.stringify({ success: false, skipped: true, reason: "no_supplier_email" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dnLabel = (dn.dn_number as string)?.trim() || deliveryNoteId.slice(0, 8);
  const { subject, html } = htmlSupplierDeliveryNoteReady({
    companyName,
    dnLabel,
    poNumber,
    status: (dn.status as string) || "—",
  });

  const resend = new Resend(resendKey);
  const from = Deno.env.get("RESEND_FROM_DELIVERY_NOTE") ?? "UjenziXform <onboarding@resend.dev>";
  const { data: sent, error: sendErr } = await resend.emails.send({
    from,
    to: [supplierEmail],
    subject,
    html,
  });

  if (sendErr) {
    console.error("notify-supplier-delivery-note: Resend", sendErr);
    return new Response(JSON.stringify({ error: sendErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      email_id: sent?.id,
      to: supplierEmail,
      dn_number: dnLabel,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
