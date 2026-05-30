/**
 * Admin reconciliation: mark an invoice paid ONLY after Paystack reference verification.
 * Requires JWT; caller must be platform admin OR invoice builder with matching Paystack payment.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUserJwt } from "../_shared/requireUserJwt.ts";
import { userIsPlatformAdmin } from "../_shared/requireAdminRole.ts";
import { verifyPaystackReference } from "../_shared/verifyPaystackReference.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PaymentRequest {
  invoice_id: string;
  payment_method: string;
  payment_reference: string;
  amount?: number;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.02;
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

  const auth = await requireUserJwt(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const body: PaymentRequest = await req.json();
    const { invoice_id, payment_method, payment_reference } = body;

    if (!invoice_id || !payment_method || !payment_reference?.trim()) {
      return new Response(
        JSON.stringify({
          error: "invoice_id, payment_method, and payment_reference (Paystack ref) are required.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const paystack = await verifyPaystackReference(payment_reference);
    if (!paystack.ok) {
      return new Response(JSON.stringify({ error: paystack.error }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!paystack.success) {
      return new Response(JSON.stringify({ error: "Paystack payment was not successful." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaOrderId = typeof paystack.metadata.order_id === "string"
      ? paystack.metadata.order_id
      : "";
    const expectedOrderId = `inv_${invoice_id}`;
    if (metaOrderId && metaOrderId !== expectedOrderId) {
      return new Response(JSON.stringify({ error: "Paystack reference does not match this invoice." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaUser = typeof paystack.metadata.user_id === "string"
      ? paystack.metadata.user_id
      : "";
    if (metaUser && metaUser !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Paystack reference belongs to another user." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        suppliers!inner(
          company_name,
          email,
          user_id
        )
      `)
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await userIsPlatformAdmin(auth.user.id);
    const builderId = String((invoice as { builder_id?: string }).builder_id ?? "");
    let ownsInvoice = builderId === auth.user.id;
    if (!ownsInvoice && builderId) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      ownsInvoice = prof?.id === builderId;
    }

    if (!isAdmin && !ownsInvoice) {
      return new Response(JSON.stringify({ error: "Forbidden." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceAmount = Number((invoice as { total_amount?: unknown }).total_amount ?? 0);
    if (!amountsMatch(paystack.amountMajor, invoiceAmount)) {
      return new Response(JSON.stringify({ error: "Paystack amount does not match invoice total." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paidStatus = (invoice as { payment_status?: string; status?: string }).payment_status
      ?? (invoice as { status?: string }).status;
    if (paidStatus === "paid") {
      return new Response(JSON.stringify({ error: "Invoice is already paid.", already_paid: true }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paidAt = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updated_at: paidAt,
      payment_status: "paid",
    };
    if ("status" in invoice) {
      updatePayload.status = "paid";
    }

    const { error: updateError } = await supabaseAdmin
      .from("invoices")
      .update(updatePayload)
      .eq("id", invoice_id);

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      throw updateError;
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("invoice_payments")
      .insert({
        invoice_id,
        payment_method,
        payment_reference: paystack.reference,
        amount_paid: paystack.amountMajor,
        payment_date: paidAt,
        status: "completed",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      throw paymentError;
    }

    await supabaseAdmin.from("delivery_communications").insert({
      sender_id: (invoice as { issuer_id?: string }).issuer_id,
      sender_type: "builder",
      sender_name: "System",
      message_type: "payment_confirmation",
      content: `Payment received for invoice ${(invoice as { invoice_number?: string }).invoice_number}. Amount: KES ${paystack.amountMajor.toLocaleString()}. Reference: ${paystack.reference}`,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: (invoice as { invoice_number?: string }).invoice_number,
        payment_id: payment.id,
        amount_paid: paystack.amountMajor,
        payment_reference: paystack.reference,
      },
    }).then(({ error }) => {
      if (error) console.error("Error creating payment notification:", error);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified and invoice marked as paid.",
        payment_id: payment.id,
        invoice_number: (invoice as { invoice_number?: string }).invoice_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in process-payment:", error);
    const message = error instanceof Error ? error.message : "Failed to process payment";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
