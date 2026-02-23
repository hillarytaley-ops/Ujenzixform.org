// Paystack Webhook Handler for UjenziPro
// Handles payment verification and status updates from Paystack

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// Paystack event types we handle
type PaystackEvent = 
  | "charge.success"
  | "charge.failed"
  | "transfer.success"
  | "transfer.failed"
  | "transfer.reversed"
  | "refund.processed"
  | "refund.failed";

interface PaystackWebhookPayload {
  event: PaystackEvent;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
      order_id?: string;
      [key: string]: any;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
    };
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

// Verify Paystack signature
async function verifyPaystackSignature(
  payload: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  return computedSignature === signature;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Paystack signature from headers
    const paystackSignature = req.headers.get("x-paystack-signature");
    
    if (!paystackSignature) {
      console.error("❌ Missing Paystack signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Get secret key from environment
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    
    if (!paystackSecretKey) {
      console.error("❌ PAYSTACK_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature
    const isValid = await verifyPaystackSignature(rawBody, paystackSignature, paystackSecretKey);
    
    if (!isValid) {
      console.error("❌ Invalid Paystack signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the webhook payload
    const payload: PaystackWebhookPayload = JSON.parse(rawBody);
    
    console.log(`📨 Received Paystack webhook: ${payload.event}`);
    console.log(`📝 Reference: ${payload.data.reference}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (payload.event) {
      case "charge.success": {
        console.log("✅ Payment successful!");
        
        // Update payment record
        const { error: paymentError } = await supabase
          .from("payments")
          .update({
            status: "success",
            paystack_transaction_id: payload.data.id.toString(),
            gateway_response: payload.data.gateway_response,
            channel: payload.data.channel,
            ip_address: payload.data.ip_address,
            card_type: payload.data.authorization?.card_type || null,
            card_last4: payload.data.authorization?.last4 || null,
            bank_name: payload.data.authorization?.bank || null,
            paid_at: payload.data.paid_at,
            updated_at: new Date().toISOString()
          })
          .eq("paystack_reference", payload.data.reference);

        if (paymentError) {
          console.error("❌ Error updating payment:", paymentError);
        }

        // Get the payment to find the order
        const { data: payment } = await supabase
          .from("payments")
          .select("purchase_order_id")
          .eq("paystack_reference", payload.data.reference)
          .single();

        // Update order status to 'paid'
        if (payment?.purchase_order_id) {
          const { error: orderError } = await supabase
            .from("purchase_orders")
            .update({ 
              status: "paid",
              updated_at: new Date().toISOString()
            })
            .eq("id", payment.purchase_order_id);

          if (orderError) {
            console.error("❌ Error updating order:", orderError);
          } else {
            console.log(`✅ Order ${payment.purchase_order_id} marked as paid`);
          }

          // Send confirmation email
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: payload.data.customer.email,
                subject: `Payment Confirmed - UjenziPro Order`,
                template: "payment_success",
                data: {
                  reference: payload.data.reference,
                  amount: payload.data.amount / 100, // Convert from kobo
                  currency: payload.data.currency,
                  order_id: payment.purchase_order_id,
                  customer_name: `${payload.data.customer.first_name || ""} ${payload.data.customer.last_name || ""}`.trim() || "Customer",
                  payment_method: payload.data.channel,
                  paid_at: payload.data.paid_at
                }
              }
            });
            console.log("📧 Confirmation email sent");
          } catch (emailError) {
            console.error("⚠️ Failed to send confirmation email:", emailError);
          }
        }

        break;
      }

      case "charge.failed": {
        console.log("❌ Payment failed!");
        
        // Update payment record
        const { error: failedError } = await supabase
          .from("payments")
          .update({
            status: "failed",
            gateway_response: payload.data.gateway_response || payload.data.message || "Payment failed",
            updated_at: new Date().toISOString()
          })
          .eq("paystack_reference", payload.data.reference);

        if (failedError) {
          console.error("❌ Error updating failed payment:", failedError);
        }

        // Get the payment to find the order
        const { data: failedPayment } = await supabase
          .from("payments")
          .select("purchase_order_id")
          .eq("paystack_reference", payload.data.reference)
          .single();

        // Update order status
        if (failedPayment?.purchase_order_id) {
          await supabase
            .from("purchase_orders")
            .update({ 
              status: "payment_failed",
              updated_at: new Date().toISOString()
            })
            .eq("id", failedPayment.purchase_order_id);
        }

        break;
      }

      case "refund.processed": {
        console.log("💰 Refund processed!");
        
        // Update payment record
        const { error: refundError } = await supabase
          .from("payments")
          .update({
            status: "refunded",
            gateway_response: "Refund processed",
            updated_at: new Date().toISOString()
          })
          .eq("paystack_reference", payload.data.reference);

        if (refundError) {
          console.error("❌ Error updating refunded payment:", refundError);
        }

        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${payload.event}`);
    }

    // Log the webhook event for auditing
    await supabase.from("analytics_events").insert({
      event_type: `paystack_webhook_${payload.event}`,
      event_data: {
        reference: payload.data.reference,
        amount: payload.data.amount,
        status: payload.data.status,
        channel: payload.data.channel
      },
      ip_address: payload.data.ip_address
    });

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
